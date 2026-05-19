import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @SuccessMessage('Healthy')
  getHealth() {
    return { status: 'ok' };
  }
}
