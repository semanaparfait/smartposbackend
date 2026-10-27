import {
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileService } from './file.service';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';

@ApiTags('Files')
@Controller('file')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an image (also removed from Cloudinary)' })
  remove(@User() user: Payload, @Param('id', ParseUUIDPipe) id: string) {
    return this.fileService.remove(user, id);
  }
}
