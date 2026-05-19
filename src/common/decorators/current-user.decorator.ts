import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../database/entities';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): UserEntity => {
  const request = context.switchToHttp().getRequest<{ user: UserEntity }>();
  return request.user;
});
