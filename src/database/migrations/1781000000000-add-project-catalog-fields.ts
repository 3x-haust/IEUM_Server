import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectCatalogFields1781000000000 implements MigrationInterface {
  name = 'AddProjectCatalogFields1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN thumbnail_path text`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN experience_category varchar(40)`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN booth_slot varchar(20)`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN stack_groups jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN feature_descriptions jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`CREATE INDEX idx_projects_experience_category ON projects(experience_category)`);
    await queryRunner.query(`CREATE INDEX idx_projects_booth_slot ON projects(booth_slot)`);
    await queryRunner.query(`ALTER TABLE visitor_profiles DROP CONSTRAINT IF EXISTS visitor_profile_recruiter_card`);
    await queryRunner.query(`ALTER TABLE visitor_profiles ADD CONSTRAINT visitor_profile_recruiter_card CHECK (visitor_type <> 'recruiter' OR business_card_registered = true)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE visitor_profiles DROP CONSTRAINT IF EXISTS visitor_profile_recruiter_card`);
    await queryRunner.query(`ALTER TABLE visitor_profiles ADD CONSTRAINT visitor_profile_recruiter_card CHECK (visitor_type <> 'recruiter' OR business_card_file_id IS NOT NULL) NOT VALID`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_booth_slot`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_experience_category`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN feature_descriptions`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN stack_groups`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN booth_slot`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN experience_category`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN thumbnail_path`);
  }
}
