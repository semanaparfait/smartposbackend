import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { LoggerService } from '../logger/logger.service';

@Injectable()
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  private static readonly DB_ERROR_MAP: Record<
    string,
    { status: number; message: string }
  > = {
    '23505': {
      status: HttpStatus.CONFLICT,
      message: 'Duplicate entry found',
    },
    '23503': {
      status: HttpStatus.CONFLICT,
      message: 'Foreign key constraint failed',
    },
    '23502': {
      status: HttpStatus.BAD_REQUEST,
      message: 'Missing required field',
    },
  };

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status: number;
    let errorResponse: Record<string, any>;

    if (exception instanceof HttpException) {
      ({ status, errorResponse } = this.handleHttpException(
        exception,
        request,
      ));
    } else if (exception instanceof EntityNotFoundError) {
      ({ status, errorResponse } = this.handleEntityNotFoundError(request));
    } else if (exception instanceof QueryFailedError) {
      ({ status, errorResponse } = this.handleQueryFailedError(
        exception,
        request,
      ));
    } else if (exception instanceof Error) {
      ({ status, errorResponse } = this.handleGenericError(exception, request));
    } else {
      ({ status, errorResponse } = this.handleUnknownError(request));
    }

    this.logException(exception, request, status);

    response.status(status).json(errorResponse);
  }

  private handleHttpException(exception: HttpException, request: Request) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    return {
      status,
      errorResponse: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        ...(typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : exceptionResponse),
      },
    };
  }

  private handleEntityNotFoundError(request: Request) {
    return {
      status: HttpStatus.NOT_FOUND,
      errorResponse: {
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        message: 'Resource not found',
        errorCode: 'ENTITY_NOT_FOUND',
      },
    };
  }

  private handleQueryFailedError(
    exception: QueryFailedError,
    request: Request,
  ) {
    const driverError: any = exception.driverError;

    const code = driverError?.code;

    const mapped = AllExceptionFilter.DB_ERROR_MAP[code];

    const status = mapped?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      mapped?.message ?? driverError?.message ?? 'Database operation failed';

    return {
      status,
      errorResponse: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        message,
        errorCode: code ?? 'DATABASE_ERROR',

        ...(process.env.NODE_ENV !== 'production' && {
          detail: driverError?.detail,
        }),
      },
    };
  }

  private handleGenericError(exception: Error, request: Request) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorResponse: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        message: exception.message || 'Internal server error',
        errorCode: 'INTERNAL_ERROR',

        ...(process.env.NODE_ENV !== 'production' && {
          stack: exception.stack,
        }),
      },
    };
  }

  private handleUnknownError(request: Request) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorResponse: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        message: 'An unknown error occurred',
        errorCode: 'UNKNOWN_ERROR',
      },
    };
  }

  private logException(
    exception: unknown,
    request: Request,
    status: number,
  ): void {
    const logMessage = `[${request.method}] ${request.originalUrl} - Status: ${status}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    if (exception instanceof HttpException) {
      this.logger.warn(
        `${logMessage} - ${JSON.stringify(exception.getResponse())}`,
      );
      return;
    }

    this.logger.warn(logMessage);
  }
}
