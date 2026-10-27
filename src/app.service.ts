import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { SeederService } from './database/seeder/seeder.service';
import { LoggerService } from './common/logger/logger.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private readonly seederService: SeederService,
    private readonly logger: LoggerService,
  ) {}

  // Runs once all modules (and the database connection) are initialised.
  async onApplicationBootstrap() {
    await this.seederService.seedAll();
    this.logger.log('All seeders loaded');
  }
}
