import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { UserRole } from '../src/database/entities/enums';

describe('RolesGuard', () => {
  it('allows matching roles', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.Admin } }) })
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects missing roles', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.Teacher]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.Student } }) })
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(false);
  });
});
