import { DataSource } from 'typeorm';
import { ProjectEntity, ProjectMemberEntity, UserEntity, UserRole } from '../entities';
import { buildStackGroups, flattenStackGroups, loadIeumCatalogProjects, rolesFromText } from './ieum-catalog.seed-data';

export async function seedProjects(dataSource: DataSource): Promise<void> {
  const users = dataSource.getRepository(UserEntity);
  const projects = dataSource.getRepository(ProjectEntity);
  const members = dataSource.getRepository(ProjectMemberEntity);
  await projects.update({ serviceName: 'IEUM Demo', teamName: 'IEUM Team' }, { isPublished: false });

  for (const seedProject of loadIeumCatalogProjects()) {
    const stackGroups = buildStackGroups(seedProject.stacks);
    const existingProject = await projects.findOne({ where: { boothSlot: seedProject.boothSlot } });
    const project = await projects.save(projects.create({
      ...(existingProject ?? {}),
      serviceName: seedProject.serviceName,
      teamName: seedProject.serviceName,
      description: seedProject.description,
      thumbnailPath: seedProject.thumbnailPath,
      experienceCategory: seedProject.experienceCategory,
      boothSlot: seedProject.boothSlot,
      developmentStacks: flattenStackGroups(stackGroups),
      designStacks: [],
      stackGroups,
      featureDescriptions: seedProject.features,
      acceptsFeedback: seedProject.acceptsFeedback,
      isPublished: true
    }));

    for (const [index, seedMember] of seedProject.members.entries()) {
      const oauthId = `seed-itshow-${seedProject.catalogId}-${index + 1}`;
      const existingUser = await users.findOne({ where: { oauthId } });
      const user = await users.save(users.create({
        ...(existingUser ?? {}),
        oauthProvider: 'mirim_oauth',
        oauthId,
        name: seedMember.name,
        email: `${oauthId}@ieum.local`,
        role: UserRole.Student
      }));
      const existingMember = await members.findOne({ where: { projectId: project.id, userId: user.id } });
      await members.save(members.create({
        ...(existingMember ?? {}),
        projectId: project.id,
        userId: user.id,
        displayOrder: index + 1,
        roles: rolesFromText(seedMember.roleText)
      }));
    }
  }
}
