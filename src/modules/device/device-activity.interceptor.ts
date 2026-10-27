import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { from, Observable, switchMap } from 'rxjs';
import { LoggerService } from 'src/common/logger/logger.service';
import { Payload } from 'src/util/token.service';
import { DeviceService } from './device.service';

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
    const action = operation?.summary ?? `${request.method} ${path}`;

    // A device that was disabled, rejected or deleted cuts off its open sessions at
    // once, instead of when their tokens expire.
    return from(this.deviceService.assertUsable(user.deviceId)).pipe(
      switchMap(() => {
        this.track(context, user, action, path);
        return next.handle();
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
          },
          request.method !== 'GET',
        )
        .catch((error: Error) =>
          this.logger.error('Failed to record device activity', error.stack),
        );
    });
  }
}
