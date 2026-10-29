import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { DataSource } from 'typeorm';
import {
  Account,
  isCurrentSession,
  loadAccount,
  SIGNED_IN_ELSEWHERE,
} from 'src/common/permissions/account';
import { hasPermission } from 'src/common/permissions/permissions';
import { UserRole } from '../user/entities/user.entity';
import {
  DeviceTypeEnum,
  RegistrationStatusEnum,
} from '../device/entities/device.entity';
import { deviceSecretMatches } from '../device/device-secret';
import { Payload } from 'src/util/token.service';
import { RealtimeEvent, Rooms } from './realtime.events';
import { sanitizeDisplayCart } from './display-cart';

// How often connected devices get their last_seen_at refreshed, so the REST
// `online` flag (2 minute window) stays true while a socket is open.
const PRESENCE_REFRESH_MS = 60_000;

interface SocketData {
  // `user`: signed in with an access token; `terminal`: a device not (yet)
  // signed in, identified by its device secret (e.g. waiting for approval).
  kind: 'user' | 'terminal';
  userId?: string;
  // Read from the account, not sent by the till: shown as "Served by" on the
  // paired customer display.
  name?: string | null;
  // Device.id (not the hardware deviceId).
  deviceId?: string;
  // Token session id (user sockets).
  sid?: string;
  companyId: string | null;
  rooms: string[];
}

type AppSocket = Socket<any, any, any, SocketData>;

export interface TerminalRow {
  id: string;
  type: DeviceTypeEnum;
  registrationStatus: RegistrationStatusEnum;
  displayForId: string | null;
}

// A registered customer display also listens to the till it is paired with.
function terminalRooms(device: TerminalRow) {
  const rooms = [Rooms.device(device.id)];

  if (
    device.type === DeviceTypeEnum.CUSTOMER_DISPLAY &&
    device.registrationStatus === RegistrationStatusEnum.REGISTERED &&
    device.displayForId
  )
    rooms.push(Rooms.display(device.displayForId));

  return rooms;
}

// Handshake (Socket.IO, namespace `/realtime`):
//   signed-in app:  io(`${API_URL}/realtime`, { auth: { token: accessToken } })
//   terminal:       io(`${API_URL}/realtime`, { auth: { deviceId, deviceSecret } })
// A refused handshake fails with `connect_error` (error.message says why).
@WebSocketGateway({ namespace: 'realtime', cors: { origin: '*' } })
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  server!: Namespace;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Device.id -> open sockets on it.
  private readonly presence = new Map<string, number>();

  private presenceTimer?: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  afterInit(server: Namespace) {
    server.use((socket: AppSocket, next) => {
      this.authenticate(socket)
        .then((data) => {
          socket.data = data;
          next();
        })
        .catch((error: Error) => next(new Error(error.message)));
    });

    this.presenceTimer = setInterval(
      () => void this.refreshPresence(),
      PRESENCE_REFRESH_MS,
    );
    this.presenceTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.presenceTimer);
  }

  async handleConnection(socket: AppSocket) {
    const { data } = socket;

    // Rejected in the middleware; Nest still calls this hook.
    if (!data?.kind) return;

    await socket.join(data.rooms);

    if (data.kind === 'terminal') {
      socket.emit(
        RealtimeEvent.DEVICE_STATUS,
        await this.deviceStatus(data.deviceId!),
      );
    }

    if (data.deviceId) this.deviceConnected(data.deviceId, data.companyId);
  }

  handleDisconnect(socket: AppSocket) {
    const { data } = socket;

    if (data?.deviceId) this.deviceDisconnected(data.deviceId, data.companyId);
  }

  // ---------- used by RealtimeService ----------

  emit(rooms: string | string[], event: string, payload: unknown) {
    // Before the server is up (e.g. seeding) there is nobody to tell.
    if (!this.server) return;

    this.server.to(rooms).emit(event, payload);
  }

  // Tells the user why, then closes every socket they have open.
  revokeUser(userId: string, reason: string) {
    if (!this.server) return;

    this.server
      .to(Rooms.user(userId))
      .emit(RealtimeEvent.SESSION_REVOKED, { reason });
    this.server.in(Rooms.user(userId)).disconnectSockets(true);
  }

  // Signs out everyone using the device; its terminal socket stays connected so
  // it still hears when the device is enabled again.
  async revokeDeviceSessions(deviceId: string, reason: string) {
    if (!this.server) return;

    const sockets = await this.server.in(Rooms.device(deviceId)).fetchSockets();

    for (const socket of sockets) {
      if (socket.data.kind !== 'user') continue;

      socket.emit(RealtimeEvent.SESSION_REVOKED, { reason });
      socket.disconnect(true);
    }
  }

  async revokeOtherSessions(userId: string, sid: string, deviceId?: string) {
    if (!this.server) return;

    const sockets = await this.server.in(Rooms.user(userId)).fetchSockets();

    for (const socket of sockets) {
      if (socket.data.sid === sid) continue;
      if (deviceId && socket.data.deviceId === deviceId) continue;

      socket.emit(RealtimeEvent.SESSION_REVOKED, {
        reason: SIGNED_IN_ELSEWHERE,
      });
      socket.disconnect(true);
    }
  }

  // Re-reads the user's account after their role or status changed: moves their
  // sockets in/out of the orders/devices rooms and sends the new permissions.
  async refreshUser(userId: string) {
    if (!this.server) return;

    const sockets = await this.server.in(Rooms.user(userId)).fetchSockets();
    if (!sockets.length) return;

    const account = await loadAccount(this.dataSource, userId);

    if (!account?.active)
      return this.revokeUser(userId, 'Your account has been deactivated');

    for (const socket of sockets) {
      const rooms = this.roomsFor(userId, account, socket.data.deviceId);

      for (const room of socket.data.rooms)
        if (!rooms.includes(room)) socket.leave(room);
      socket.join(rooms);
      socket.data.rooms = rooms;
    }

    this.emit(Rooms.user(userId), RealtimeEvent.PERMISSIONS_CHANGED, {
      permissions: account.permissions,
    });
  }

  // A device's type, pairing or status changed: moves its terminal sockets in or
  // out of the display room of the till it shows.
  async syncTerminal(device: TerminalRow) {
    if (!this.server) return;

    const sockets = await this.server
      .in(Rooms.device(device.id))
      .fetchSockets();

    for (const socket of sockets) {
      if (socket.data.kind !== 'terminal') continue;

      const rooms = terminalRooms(device);
      for (const room of socket.data.rooms)
        if (!rooms.includes(room)) socket.leave(room);
      socket.join(rooms);
      socket.data.rooms = rooms;
    }
  }

  // A deleted device keeps its socket (it may register again) but stops showing
  // any till.
  async detachTerminal(deviceId: string) {
    if (!this.server) return;

    const sockets = await this.server.in(Rooms.device(deviceId)).fetchSockets();

    for (const socket of sockets) {
      if (socket.data.kind !== 'terminal') continue;

      for (const room of socket.data.rooms)
        if (room !== Rooms.device(deviceId)) socket.leave(room);
      socket.data.rooms = [Rooms.device(deviceId)];
    }
  }

  // ---------- from clients ----------

  // The till shows what the cashier just tapped or scanned on its customer
  // display right away, without waiting for the database. Only reaches displays
  // paired with the device the sender is signed in on.
  @SubscribeMessage(RealtimeEvent.DISPLAY_PREVIEW)
  displayPreview(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ) {
    const { kind, deviceId, name } = socket.data ?? {};
    if (kind !== 'user' || !deviceId) return;

    const cart = sanitizeDisplayCart((body as { cart?: unknown })?.cart);
    if (!cart) return;

    socket
      .to(Rooms.display(deviceId))
      .emit(RealtimeEvent.DISPLAY_PREVIEW, { cart, cashier: name ?? null });
  }

  // ---------- handshake ----------

  private async authenticate(socket: AppSocket): Promise<SocketData> {
    const auth = (socket.handshake.auth ?? {}) as Record<string, unknown>;
    const [type, bearer] =
      socket.handshake.headers.authorization?.split(' ') ?? [];
    const token =
      typeof auth.token === 'string'
        ? auth.token
        : type === 'Bearer'
          ? bearer
          : undefined;

    if (token) return this.authenticateUser(token);

    if (
      typeof auth.deviceId === 'string' &&
      typeof auth.deviceSecret === 'string'
    )
      return this.authenticateTerminal(auth.deviceId, auth.deviceSecret);

    throw new Error('Send auth.token, or auth.deviceId and auth.deviceSecret');
  }

  private async authenticateUser(token: string): Promise<SocketData> {
    let payload: Payload;

    try {
      payload = await this.jwtService.verifyAsync<Payload>(token, {
        secret: `${this.config.get('server.jwt_access').secret}`,
      });
    } catch (error) {
      throw new Error(`Unauthorized: ${(error as Error).message}`);
    }

    const account = await loadAccount(this.dataSource, payload.sub);

    if (!account) throw new Error('Unauthorized: user not found');

    if (!account.active) throw new Error('Your account has been deactivated');

    if (!isCurrentSession(account, payload.sid))
      throw new Error(SIGNED_IN_ELSEWHERE);

    if (payload.deviceId) {
      const { status, type } = await this.deviceStatus(payload.deviceId);

      if (status !== RegistrationStatusEnum.REGISTERED)
        throw new Error(
          `Device is ${status?.toLowerCase() ?? 'removed'}, please login again`,
        );

      if (type === DeviceTypeEnum.CUSTOMER_DISPLAY)
        throw new Error('This device is now a customer display');
    }

    return {
      kind: 'user',
      userId: payload.sub,
      name: account.name,
      deviceId: payload.deviceId,
      sid: payload.sid,
      companyId: account.companyId,
      rooms: this.roomsFor(payload.sub, account, payload.deviceId),
    };
  }

  private async authenticateTerminal(
    hardwareId: string,
    secret: string,
  ): Promise<SocketData> {
    const rows: (TerminalRow & {
      company_id: string | null;
      secret_hash: string | null;
    })[] = await this.dataSource.query(
      `SELECT id, company_id, secret_hash, type,
              registration_status AS "registrationStatus",
              display_for_id AS "displayForId"
         FROM devices WHERE device_id = $1`,
      [hardwareId],
    );

    const device = rows[0];

    if (!device || !deviceSecretMatches(secret, device.secret_hash))
      throw new Error('Invalid device secret');

    return {
      kind: 'terminal',
      deviceId: device.id,
      companyId: device.company_id,
      rooms: terminalRooms(device),
    };
  }

  private roomsFor(userId: string, account: Account, deviceId?: string) {
    const rooms = [Rooms.user(userId)];
    const user = { role: account.role, permissions: account.permissions };
    const can = (key: string) => hasPermission(user as Payload, key);

    if (account.role === UserRole.SUPERADMIN) rooms.push(Rooms.admin);

    if (account.companyId) {
      rooms.push(Rooms.company(account.companyId));
      if (can('orders.view_all')) rooms.push(Rooms.orders(account.companyId));
      if (can('devices.manage')) rooms.push(Rooms.devices(account.companyId));
    }

    if (deviceId) rooms.push(Rooms.device(deviceId));

    return rooms;
  }

  // ---------- presence ----------

  private deviceConnected(deviceId: string, companyId: string | null) {
    const count = (this.presence.get(deviceId) ?? 0) + 1;
    this.presence.set(deviceId, count);

    if (count === 1) {
      void this.touch([deviceId]);
      this.emitPresence(deviceId, companyId, true);
    }
  }

  private deviceDisconnected(deviceId: string, companyId: string | null) {
    const count = (this.presence.get(deviceId) ?? 1) - 1;

    if (count > 0) return void this.presence.set(deviceId, count);

    this.presence.delete(deviceId);
    void this.touch([deviceId]);
    this.emitPresence(deviceId, companyId, false);
  }

  private emitPresence(
    deviceId: string,
    companyId: string | null,
    online: boolean,
  ) {
    const rooms = companyId
      ? [Rooms.devices(companyId), Rooms.admin]
      : [Rooms.admin];

    this.emit(rooms, RealtimeEvent.DEVICE_PRESENCE, { deviceId, online });
  }

  private refreshPresence() {
    const ids = [...this.presence.keys()];
    if (ids.length) return this.touch(ids);
  }

  // Raw query: tracking writes stay out of the audit history.
  private async touch(deviceIds: string[]) {
    try {
      await this.dataSource.query(
        `UPDATE devices SET last_seen_at = $2 WHERE id = ANY($1)`,
        // Written like TypeORM writes it (the column has no time zone).
        [deviceIds, new Date()],
      );
    } catch (error) {
      this.logger.error(
        'Failed to update device presence',
        (error as Error).stack,
      );
    }
  }

  // Same shape as RealtimeService.deviceStatus.
  private async deviceStatus(deviceId: string) {
    const rows: {
      registration_status: RegistrationStatusEnum;
      type: DeviceTypeEnum;
      display_for_id: string | null;
      momo_code: string | null;
    }[] = await this.dataSource.query(
      `SELECT d.registration_status, d.type, d.display_for_id,
              COALESCE(d.momo_code, t.momo_code) AS momo_code
         FROM devices d
         LEFT JOIN devices t ON t.id = d.display_for_id
        WHERE d.id = $1`,
      [deviceId],
    );

    const row = rows[0];
    return {
      status: row?.registration_status ?? null,
      type: row?.type ?? null,
      displayForId: row?.display_for_id ?? null,
      momoCode: row?.momo_code ?? null,
    };
  }
}
