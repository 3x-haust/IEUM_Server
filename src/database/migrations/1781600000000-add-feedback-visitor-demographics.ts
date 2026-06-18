import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbackVisitorDemographics1781600000000 implements MigrationInterface {
  name = 'AddFeedbackVisitorDemographics1781600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS visitor_profile_id uuid`);
    await queryRunner.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS age_group varchar(40)`);
    await queryRunner.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS visitor_type varchar(40)`);
    await queryRunner.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS gender varchar(20)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_feedback_visitor_profile'
            AND table_name = 'feedback'
        ) THEN
          ALTER TABLE feedback
            ADD CONSTRAINT fk_feedback_visitor_profile
            FOREIGN KEY (visitor_profile_id)
            REFERENCES visitor_profiles(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_feedback_visitor_demographics ON feedback(age_group, gender, visitor_type) WHERE status <> 'deleted'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedback_visitor_demographics`);
    await queryRunner.query(`ALTER TABLE feedback DROP CONSTRAINT IF EXISTS fk_feedback_visitor_profile`);
    await queryRunner.query(`ALTER TABLE feedback DROP COLUMN IF EXISTS gender`);
    await queryRunner.query(`ALTER TABLE feedback DROP COLUMN IF EXISTS visitor_type`);
    await queryRunner.query(`ALTER TABLE feedback DROP COLUMN IF EXISTS age_group`);
    await queryRunner.query(`ALTER TABLE feedback DROP COLUMN IF EXISTS visitor_profile_id`);
  }
}
