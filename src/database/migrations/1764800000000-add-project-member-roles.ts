import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectMemberRoles1764800000000 implements MigrationInterface {
  name = 'AddProjectMemberRoles1764800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE project_member_role AS ENUM ('backend', 'frontend', 'design', 'pm', 'ai'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(`ALTER TABLE project_members ADD COLUMN roles project_member_role[] NOT NULL DEFAULT '{}'::project_member_role[]`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project_members DROP COLUMN roles`);
    await queryRunner.query(`DROP TYPE IF EXISTS project_member_role`);
  }
}
