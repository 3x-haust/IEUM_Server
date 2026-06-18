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
    Unique: decorator,
    UpdateDateColumn: decorator,
    Not: jest.fn((value: unknown) => ({ not: value }))
  };
}, { virtual: true });

import { ContactStatus, FeedbackStatus } from '../src/database/entities';
import { StatsService } from '../src/modules/stats/stats.service';

describe('StatsService', () => {
  function queryBuilder(rows: readonly unknown[]) {
    return {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows)
    };
  }

  it('builds dashboard from grouped status queries and caches the result', async () => {
    const projects = { count: jest.fn().mockResolvedValue(2) };
    const feedback = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(queryBuilder([
          { status: FeedbackStatus.Public, count: '10' },
          { status: FeedbackStatus.Blocked, count: '1' }
        ]))
        .mockReturnValueOnce(queryBuilder([{ key: 'adult', count: '7' }]))
        .mockReturnValueOnce(queryBuilder([{ key: 'male', count: '4' }, { key: 'female', count: '3' }]))
        .mockReturnValueOnce(queryBuilder([{ key: 'general', count: '5' }, { key: 'recruiter', count: '2' }]))
    };
    const contacts = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([
        { status: ContactStatus.New, count: '4' },
        { status: ContactStatus.Checked, count: '6' },
        { status: ContactStatus.Deleted, count: '2' }
      ]))
    };
    const interests = { count: jest.fn().mockResolvedValue(12) };
    const cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };
    const projectsService = {};
    const service = new StatsService(projects as never, feedback as never, contacts as never, interests as never, cache as never, projectsService as never);

    const result = await service.dashboard();

    expect(result).toEqual({
      projectCount: 2,
      feedbackCount: 10,
      contactCount: 10,
      newContactCount: 4,
      interestCount: 12,
      feedbackByStatus: { public: 10, blocked: 1 },
      feedbackByAgeGroup: { adult: 7 },
      feedbackByGender: { male: 4, female: 3 },
      feedbackByVisitorType: { general: 5, recruiter: 2 },
      contactsByStatus: { new: 4, checked: 6, deleted: 2 }
    });
    expect(cache.get).toHaveBeenCalledWith('stats:dashboard');
    expect(cache.set).toHaveBeenCalledWith('stats:dashboard', result, 30);
  });
});
