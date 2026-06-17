jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;
  return {
    Brackets: class Brackets {
      constructor(readonly whereFactory: unknown) {}
    },
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
    UpdateDateColumn: decorator
  };
}, { virtual: true });

import { ProjectsService } from '../src/modules/projects/projects.service';
import { ProjectMemberRole } from '../src/database/entities';
import { buildDesignStackGroups, flattenStackGroups, loadIeumCatalogProjects } from '../src/database/seeds/ieum-catalog.seed-data';

describe('ProjectsService', () => {
  function queryBuilder(rows: readonly unknown[]) {
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
      getRawMany: jest.fn().mockResolvedValue(rows)
    };
  }

  it('batches project summary counts instead of counting per project', async () => {
    const project = {
      id: 'project-1',
      serviceName: 'IEUM',
      teamName: '3xhaust',
      description: null,
      thumbnailFile: null,
      boothSlot: 'G7',
      developmentStacks: ['NestJS'],
      designStacks: ['Figma'],
      acceptsFeedback: false,
      isPublished: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    };
    const projects = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([project])) };
    const members = {};
    const feedback = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([{ projectId: project.id, count: '7' }]))
    };
    const contacts = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([{ projectId: project.id, count: '3' }]))
    };
    const interests = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([{ projectId: project.id, count: '2' }]))
    };
    const service = new ProjectsService(projects as never, members as never, feedback as never, contacts as never, interests as never);

    const result = await service.listPublic({ limit: 20 });

    expect(feedback.count).not.toHaveBeenCalled();
    expect(contacts.count).not.toHaveBeenCalled();
    expect(interests.count).not.toHaveBeenCalled();
    expect(feedback.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(contacts.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(interests.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([
      expect.objectContaining({ id: project.id, boothSlot: 'G7', zone: 'G7', acceptsFeedback: false, feedbackCount: 7, contactCount: 3 })
    ]);
    expect(result.items[0]).not.toHaveProperty('interestCount');
  });

  it('skips public project summary counts when includeCounts is false', async () => {
    const project = {
      id: 'project-1',
      serviceName: 'IEUM',
      teamName: '3xhaust',
      description: null,
      thumbnailFile: null,
      boothSlot: 'G7',
      developmentStacks: ['NestJS'],
      designStacks: ['Figma'],
      acceptsFeedback: true,
      isPublished: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    };
    const projects = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([project])) };
    const members = {};
    const feedback = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([{ projectId: project.id, count: '7' }])) };
    const contacts = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([{ projectId: project.id, count: '3' }])) };
    const interests = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([{ projectId: project.id, count: '2' }])) };
    const service = new ProjectsService(projects as never, members as never, feedback as never, contacts as never, interests as never);

    const result = await service.listPublic({ limit: 20, includeCounts: false });

    expect(feedback.createQueryBuilder).not.toHaveBeenCalled();
    expect(contacts.createQueryBuilder).not.toHaveBeenCalled();
    expect(interests.createQueryBuilder).not.toHaveBeenCalled();
    expect(result.items).toEqual([
      expect.objectContaining({ id: project.id, feedbackCount: 0, contactCount: 0 })
    ]);
  });

  it('includes project member roles in project detail responses', async () => {
    const project = {
      id: 'project-1',
      serviceName: 'IEUM',
      teamName: '3xhaust',
      description: null,
      thumbnailFile: null,
      boothSlot: 'G7',
      developmentStacks: ['NestJS'],
      designStacks: ['Figma'],
      acceptsFeedback: true,
      isPublished: true,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      members: [{
        user: { id: 'user-1', name: '김이음' },
        displayOrder: 1,
        roles: [ProjectMemberRole.Backend, ProjectMemberRole.Frontend]
      }]
    };
    const projects = { findOne: jest.fn().mockResolvedValue(project) };
    const members = {};
    const feedback = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([])) };
    const contacts = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([])) };
    const interests = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder([])) };
    const service = new ProjectsService(projects as never, members as never, feedback as never, contacts as never, interests as never);

    const result = await service.getPublic(project.id);

    expect(result).toEqual(expect.objectContaining({
      boothSlot: 'G7',
      zone: 'G7',
      members: [{
        id: 'user-1',
        name: '김이음',
        displayOrder: 1,
        roles: [ProjectMemberRole.Backend, ProjectMemberRole.Frontend]
      }]
    }));
  });

  it('loads the G7 booth zone from the IEUM catalog seed data', () => {
    const projects = loadIeumCatalogProjects();

    const mytsuri = projects.find((project) => project.catalogId === 41);

    expect(mytsuri).toEqual(expect.objectContaining({
      serviceName: 'Mytsuri',
      boothSlot: 'G7',
      experienceCategory: 'global'
    }));
  });

  it('keeps design department hyphen slots separate from development slots', () => {
    const projects = loadIeumCatalogProjects();
    const projectsBySlot = new Map(projects.map((project) => [project.boothSlot, project]));
    const designSlots = [
      'A-1', 'A-2', 'A-3', 'A-4', 'A-5',
      'B-1', 'B-2', 'B-3', 'B-4', 'B-5',
      'C-1', 'C-2', 'C-3', 'C-4', 'C-5',
      'D-1', 'D-2', 'D-3', 'D-4', 'D-5',
      'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6',
      'F-1', 'F-2', 'F-3', 'F-4', 'F-5', 'F-6'
    ];

    expect(projectsBySlot.get('A1')).toEqual(expect.objectContaining({
      serviceName: 'MALO',
      experienceCategory: 'ai'
    }));
    expect(projectsBySlot.get('A-1')).toEqual(expect.objectContaining({
      serviceName: 'INFLOW',
      experienceCategory: 'ai',
      acceptsFeedback: true
    }));
    expect(projectsBySlot.get('E1')).toEqual(expect.objectContaining({
      serviceName: '쁘이',
      experienceCategory: 'creative'
    }));
    expect(projectsBySlot.get('E-1')).toEqual(expect.objectContaining({
      serviceName: '십만원권',
      experienceCategory: 'creative',
      acceptsFeedback: true
    }));
    expect(projectsBySlot.get('B-5')).toEqual(expect.objectContaining({
      serviceName: '놀다보니',
      experienceCategory: 'human'
    }));
    for (const slot of designSlots) {
      expect(projectsBySlot.get(slot)).toEqual(expect.objectContaining({
        boothSlot: slot,
        acceptsFeedback: true
      }));
    }
  });

  it('groups design department stacks as design stacks', () => {
    const groups = buildDesignStackGroups(['Figma', 'Illustrator', 'Figma']);

    expect(groups).toEqual([{
      category: 'Design',
      color: '#C797C5',
      items: ['Figma', 'Illustrator']
    }]);
    expect(flattenStackGroups(groups)).toEqual(['Figma', 'Illustrator']);
  });
});
