import { DataSource } from 'typeorm';
import { ProjectEntity, ProjectMemberEntity, UserEntity, UserRole } from '../entities';
import { buildDesignStackGroups, buildStackGroups, flattenStackGroups, loadIeumCatalogProjects, rolesFromText } from './ieum-catalog.seed-data';

export async function seedProjects(dataSource: DataSource): Promise<void> {
  const users = dataSource.getRepository(UserEntity);
  const projects = dataSource.getRepository(ProjectEntity);
  const members = dataSource.getRepository(ProjectMemberEntity);
  await projects.update({ serviceName: 'IEUM Demo', teamName: 'IEUM Team' }, { isPublished: false });

  for (const seedProject of loadIeumCatalogProjects()) {
    const isDesignDepartmentProject = seedProject.boothSlot.includes('-');
    const stackGroups = isDesignDepartmentProject
      ? buildDesignStackGroups(seedProject.stacks)
      : buildStackGroups(seedProject.stacks);
    const flatStacks = flattenStackGroups(stackGroups);
    const existingProject = await projects.findOne({ where: { boothSlot: seedProject.boothSlot } });
    const project = await projects.save(projects.create({
      ...(existingProject ?? {}),
      serviceName: seedProject.serviceName,
      teamName: seedProject.serviceName,
      description: seedProject.description,
      thumbnailPath: seedProject.thumbnailPath,
      experienceCategory: seedProject.experienceCategory,
      boothSlot: seedProject.boothSlot,
      developmentStacks: isDesignDepartmentProject ? [] : flatStacks,
      designStacks: isDesignDepartmentProject ? flatStacks : [],
      stackGroups,
      featureDescriptions: seedProject.features,
      acceptsFeedback: seedProject.acceptsFeedback,
      isPublished: true
    }));

    for (const [index, seedMember] of seedProject.members.entries()) {
      const oauthId = `seed-itshow-${seedProject.catalogId}-${index + 1}`;
      const displayOrder = index + 1;
      const existingSlot = await members.findOne({
        where: { projectId: project.id, displayOrder },
        relations: { user: true }
      });
      const user = existingSlot?.user ?? await users.save(users.create({
        ...(await users.findOne({ where: { oauthId } }) ?? {}),
        oauthProvider: 'mirim_oauth',
        oauthId,
        name: seedMember.name,
        email: `${oauthId}@ieum.local`,
        role: UserRole.Student
      }));
      const existingMember = existingSlot ?? await members.findOne({ where: { projectId: project.id, userId: user.id } });
      await members.save(members.create({
        ...(existingMember ?? {}),
        projectId: project.id,
        userId: user.id,
        displayOrder,
        roles: rolesFromText(seedMember.roleText)
      }));
    }
  }
}
