import {
  Controller,
  InternalServerErrorException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from './modules/user/entities/user.entity';

@ApiTags('System')
@Controller('system')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
export class SystemController {
  // Fails on purpose so the super admin can see an error reach Sentry.
  @Post('test-error')
  @ApiOperation({ summary: 'Send a test error to error tracking' })
  testError(): never {
    const error = new Error(
      `SmartPOS test error from the server (${new Date().toISOString()})`,
    );
    // A plain Error is a server fault (500), the kind error tracking keeps.
    throw Object.assign(new InternalServerErrorException(error.message), {
      cause: error,
    });
  }
}
