import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectFeedbackFlag1781100000000 implements MigrationInterface {
  name = 'AddProjectFeedbackFlag1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS accepts_feedback boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS accepts_feedback`);
  }
}
