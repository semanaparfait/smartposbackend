import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { LoggerService } from 'src/common/logger/logger.service';
import { Payload } from 'src/util/token.service';
import { DeviceService } from './device.service';
import { DEVICE_CHECKED } from 'src/common/guards/roles.guard';
import { errorText, plainAction } from './activity-text';

// Set on the request when the handler fails, so the log keeps the real message.
const ERROR_TEXT = Symbol('deviceActivityError');

// Metadata key used by @ApiOperation (not exported from @nestjs/swagger's public entry point).
const API_OPERATION_KEY = 'swagger/apiOperation';

// Tracks what is happening on each device: every authenticated request made from a
// device session marks the device as seen and updates its last activity; state-changing
// requests (anything but GET) are also written to the device activity log.
@Injectable()
export class DeviceActivityInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly deviceService: DeviceService,
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as Payload | undefined;

    if (!user?.deviceId) return next.handle();

    const operation = this.reflector.get<{ summary?: string }>(
      API_OPERATION_KEY,
      context.getHandler(),
    );
    const path = request.route?.path ?? request.path;
    // Plain words for owners; the endpoint is kept in method/path for the super admin.
    const action = plainAction(operation?.summary ?? '');

    // A device that was disabled, rejected or deleted cuts off its open sessions at
    // once, instead of when their tokens expire. RolesGuard already checks it for
    // employees (in the same query as their account), saving a round trip.
    if (request[DEVICE_CHECKED]) {
      this.track(context, user, action, path);
      return this.withError(request, next.handle());
    }

    return from(this.deviceService.assertUsable(user.deviceId)).pipe(
      switchMap(() => {
        this.track(context, user, action, path);
        return this.withError(request, next.handle());
      }),
    );
  }

  private withError(request: Request, stream: Observable<any>) {
    return stream.pipe(
      catchError((error: unknown) => {
        (request as unknown as Record<symbol, string>)[ERROR_TEXT] =
          errorText(error);
        return throwError(() => error);
      }),
    );
  }

  private track(
    context: ExecutionContext,
    user: Payload,
    action: string,
    path: string,
  ) {
    const request = context.switchToHttp().getRequest<Request>();

    // Wait for the response so the real status code (including errors) is recorded.
    const response = context.switchToHttp().getResponse<Response>();
    response.once('finish', () => {
      this.deviceService
        .recordRequest(
          user.deviceId as string,
          user.sub,
          {
            action,
            method: request.method,
            path,
            statusCode: response.statusCode,
            message:
              (request as unknown as Record<symbol, string | undefined>)[
                ERROR_TEXT
              ] ?? null,
          },
          request.method !== 'GET',
        )
        .catch((error: Error) =>
          this.logger.error('Failed to record device activity', error.stack),
        );
    });
  }
}
