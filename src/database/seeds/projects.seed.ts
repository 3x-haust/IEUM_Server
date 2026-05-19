import { DataSource } from 'typeorm';
import { ProjectEntity, ProjectMemberEntity, UserEntity, UserRole } from '../entities';

export async function seedProjects(dataSource: DataSource): Promise<void> {
  const users = dataSource.getRepository(UserEntity);
  const projects = dataSource.getRepository(ProjectEntity);
  const members = dataSource.getRepository(ProjectMemberEntity);
  const seedUsers = [
    { oauthId: 'seed-student-1', name: '김이음', email: 'student1@example.com' },
    { oauthId: 'seed-student-2', name: '박미림', email: 'student2@example.com' },
    { oauthId: 'seed-student-3', name: '최프로', email: 'student3@example.com' }
  ];
  const savedUsers: UserEntity[] = [];
  for (const seedUser of seedUsers) {
    const existing = await users.findOne({ where: { oauthId: seedUser.oauthId } });
    const user = await users.save(users.create({ ...(existing ?? {}), oauthProvider: 'mirim_oauth', oauthId: seedUser.oauthId, name: seedUser.name, email: seedUser.email, role: UserRole.Student }));
    savedUsers.push(user);
  }
  const existingProject = await projects.findOne({ where: { serviceName: 'IEUM Demo', teamName: 'IEUM Team' } });
  const project = await projects.save(projects.create({
    ...(existingProject ?? {}),
    serviceName: 'IEUM Demo',
    teamName: 'IEUM Team',
    description: '전시 프로젝트 피드백과 컨택을 관리하는 시드 프로젝트',
    developmentStacks: ['NestJS', 'PostgreSQL', 'Redis', 'Kafka'],
    designStacks: ['Figma'],
    isPublished: true
  }));
  for (const [index, user] of savedUsers.entries()) {
    const existingMember = await members.findOne({ where: { projectId: project.id, userId: user.id } });
    await members.save(members.create({ ...(existingMember ?? {}), projectId: project.id, userId: user.id, displayOrder: index + 1 }));
  }
}
