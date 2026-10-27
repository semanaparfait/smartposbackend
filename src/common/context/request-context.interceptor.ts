import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Payload } from 'src/util/token.service';
import { RequestContext } from './request-context';

// Runs the route handler inside a RequestContext holding the authenticated user.
// Interceptors run after guards, so request.user is already set by AuthGuard.
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const user = context.switchToHttp().getRequest()['user'] as
      | Payload
      | undefined;

    const actor = user
      ? {
          id: user.sub,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        }
      : undefined;

    return new Observable((subscriber) =>
      RequestContext.run(actor, () => next.handle().subscribe(subscriber)),
    );
  }
}
