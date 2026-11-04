import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from '../user/entities/user.entity';
import { Payload } from 'src/util/token.service';
import { InboxService } from './inbox.service';
import {
  ContactMessageDto,
  InboxQueryDto,
  InstallationRequestDto,
  UpdateInboxDto,
} from './dto/inbox.dto';

@ApiTags('Inbox')
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class InboxController {
  constructor(private readonly service: InboxService) {}

  @Public()
  @Post('installation-requests')
  @ApiOperation({ summary: 'Website: ask for SmartPOS to be installed' })
  installation(@Body() dto: InstallationRequestDto, @Ip() ip: string) {
    return this.service.installation(dto, ip);
  }

  @Public()
  @Post('contact-messages')
  @ApiOperation({ summary: 'Website: send the SmartPOS team a message' })
  contact(@Body() dto: ContactMessageDto, @Ip() ip: string) {
    return this.service.contact(dto, ip);
  }

  @Get('inbox')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Requests, messages and password help (newest first)',
  })
  list(@Query() query: InboxQueryDto) {
    return this.service.list(query);
  }

  @Patch('inbox/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark as new, in progress or done; keep a note' })
  update(
    @User() user: Payload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInboxDto,
  ) {
    return this.service.update(user, id, dto);
  }
}
