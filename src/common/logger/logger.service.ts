import {
  Injectable,
  Logger as NestLogger,
  LoggerService as NestLoggerService,
} from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger = new NestLogger();

  log(message: any, ...optionalParams: any[]) {
    this.logger.log(this.normalize(message), ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error(this.normalize(message), ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(this.normalize(message), ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(this.normalize(message), ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(this.normalize(message), ...optionalParams);
  }

  private normalize(message: any) {
    if (message === undefined) return 'undefined';
    if (message === null) return 'null';

    return typeof message === 'string' ? message : JSON.stringify(message);
  }
}
