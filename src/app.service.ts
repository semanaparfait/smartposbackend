import { Injectable } from '@nestjs/common';
import { SeederService } from './database/seeder/seeder.service';
import { LoggerService } from './common/logger/logger.service';

@Injectable()
export class AppService {
  constructor(
    private readonly seederService: SeederService,
    private readonly logger: LoggerService,
  ) {
    this.runSeeders();
  }

  async runSeeders() {
    await this.seederService.seedAll();
    this.logger.log('All seeders loaded');
  }
}
