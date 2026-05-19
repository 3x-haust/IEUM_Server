import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { BannedWordListQueryDto, CreateBannedWordDto, UpdateBannedWordDto } from './banned-words.dto';
import { BannedWordsService } from './banned-words.service';

@ApiTags('banned-words')
@ApiCookieAuth('ieum_auth')
@UseGuards(MirimAuthGuard, RolesGuard)
@Roles(UserRole.Teacher, UserRole.Admin)
@Controller('admin/banned-words')
export class BannedWordsController {
  constructor(private readonly bannedWordsService: BannedWordsService) {}

  @Get()
  @SuccessMessage('Fetched banned words')
  list(@Query() query: BannedWordListQueryDto) {
    return this.bannedWordsService.list(query);
  }

  @Post()
  @SuccessMessage('Created banned word')
  create(@Body() dto: CreateBannedWordDto, @CurrentUser() user: UserEntity) {
    return this.bannedWordsService.create(dto, user);
  }

  @Patch(':id')
  @SuccessMessage('Updated banned word')
  update(@Param('id') id: string, @Body() dto: UpdateBannedWordDto, @CurrentUser() user: UserEntity) {
    return this.bannedWordsService.update(id, dto, user);
  }

  @Delete(':id')
  @SuccessMessage('Deleted banned word')
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.bannedWordsService.remove(id, user);
  }
}
