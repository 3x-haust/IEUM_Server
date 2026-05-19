import { Controller, Get, MessageEvent, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { RealtimeService } from './realtime.service';

@ApiTags('realtime')
@ApiBearerAuth()
@UseGuards(MirimAuthGuard)
@Controller('realtime/events')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse()
  stream(@CurrentUser() user: UserEntity): Observable<MessageEvent> {
    return this.realtimeService.subscribe(user.role);
  }

  @Get('recent')
  recent(@Query('after') after?: string) {
    return this.realtimeService.recent(after);
  }
}
