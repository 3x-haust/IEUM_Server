import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectInterests1764000000000 implements MigrationInterface {
  name = 'AddProjectInterests1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE realtime_event_type ADD VALUE IF NOT EXISTS 'project_interest.created'`);
    await queryRunner.query(`CREATE TABLE project_interests (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, ip_hash varchar(255), user_agent text, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT project_interests_project_ip_unique UNIQUE (project_id, ip_hash))`);
    await queryRunner.query(`CREATE INDEX idx_project_interests_project_created ON project_interests(project_id, created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_interests_project_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_interests`);
    await queryRunner.query(`DELETE FROM event_outbox WHERE event_type = 'project_interest.created'`);
    await queryRunner.query(`DELETE FROM realtime_events WHERE type = 'project_interest.created'`);
    await queryRunner.query(`ALTER TYPE realtime_event_type RENAME TO realtime_event_type_old`);
    await queryRunner.query(`CREATE TYPE realtime_event_type AS ENUM ('feedback.created', 'feedback.status_changed', 'contact.created', 'contact.status_changed', 'visitor_profile.created', 'file.uploaded', 'audit.created')`);
    await queryRunner.query(`ALTER TABLE realtime_events ALTER COLUMN type TYPE realtime_event_type USING type::text::realtime_event_type`);
    await queryRunner.query(`DROP TYPE realtime_event_type_old`);
  }
}
