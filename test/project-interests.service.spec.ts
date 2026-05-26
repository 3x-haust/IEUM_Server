jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;
  return {
    Column: decorator,
    CreateDateColumn: decorator,
    DeleteDateColumn: decorator,
    Entity: decorator,
    Index: decorator,
    JoinColumn: decorator,
    ManyToOne: decorator,
    OneToMany: decorator,
    PrimaryGeneratedColumn: decorator,
    QueryFailedError: class QueryFailedError extends Error {},
    Unique: decorator,
    UpdateDateColumn: decorator
  };
}, { virtual: true });

import { ProjectInterestsService } from '../src/modules/project-interests/project-interests.service';
import { RealtimeEventType, UserRole } from '../src/database/entities';

describe('ProjectInterestsService', () => {
  const projectId = '11111111-1111-1111-1111-111111111111';

  function createService() {
    const interests = {
      findOne: jest.fn(),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
      count: jest.fn()
    };
    const projects = { findProject: jest.fn().mockResolvedValue({ id: projectId }) };
    const rateLimit = { enforce: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new ProjectInterestsService(interests as never, projects as never, rateLimit as never, events as never);
    return { service, interests, projects, rateLimit, events };
  }

  it('creates an interest marker and publishes an event', async () => {
    const { service, interests, rateLimit, events } = createService();
    interests.findOne.mockResolvedValue(null);
    interests.save.mockResolvedValue({ id: 'interest-id', projectId });
    interests.count.mockResolvedValue(1);

    const result = await service.create(projectId, '127.0.0.1', 'Mozilla/5.0');

    expect(rateLimit.enforce).toHaveBeenCalledWith(expect.stringContaining('ratelimit:project-interest:'), 30, 60);
    expect(interests.save).toHaveBeenCalledWith(expect.objectContaining({ projectId, userAgent: 'Mozilla/5.0' }));
    expect(events.publish).toHaveBeenCalledWith(RealtimeEventType.ProjectInterestCreated, projectId, UserRole.Teacher, { interestId: 'interest-id' }, 'project_interest', 'interest-id');
    expect(result).toEqual({ projectId, interestCount: 1, alreadyInterested: false });
  });

  it('does not create duplicate interests for the same project and IP hash', async () => {
    const { service, interests, events } = createService();
    interests.findOne.mockResolvedValue({ id: 'existing-interest-id', projectId });
    interests.count.mockResolvedValue(1);

    const result = await service.create(projectId, '127.0.0.1', 'Mozilla/5.0');

    expect(interests.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(result).toEqual({ projectId, interestCount: 1, alreadyInterested: true });
  });
});
