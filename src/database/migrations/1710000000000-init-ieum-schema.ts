import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitIeumSchema1710000000000 implements MigrationInterface {
  name = 'InitIeumSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin')`);
    await queryRunner.query(`CREATE TYPE contact_age_group AS ENUM ('middle_school', 'high_school', 'university', 'adult', 'other')`);
    await queryRunner.query(`CREATE TYPE contact_visitor_type AS ENUM ('general', 'recruiter')`);
    await queryRunner.query(`CREATE TYPE feedback_status AS ENUM ('public', 'blocked', 'deleted')`);
    await queryRunner.query(`CREATE TYPE contact_status AS ENUM ('new', 'checked', 'archived', 'deleted')`);
    await queryRunner.query(`CREATE TYPE file_access_level AS ENUM ('public', 'private')`);
    await queryRunner.query(`CREATE TYPE audit_action AS ENUM ('feedback_status_changed', 'contact_viewed', 'contact_status_changed', 'contact_ocr_updated', 'banned_word_created', 'banned_word_updated', 'banned_word_deleted', 'file_viewed')`);
    await queryRunner.query(`CREATE TYPE realtime_event_type AS ENUM ('feedback.created', 'feedback.status_changed', 'contact.created', 'contact.status_changed', 'visitor_profile.created', 'file.uploaded', 'audit.created')`);
    await queryRunner.query(`CREATE TYPE outbox_status AS ENUM ('pending', 'published', 'failed')`);
    await queryRunner.query(`CREATE TABLE users (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), oauth_provider varchar(50) NOT NULL DEFAULT 'mirim_oauth', oauth_id varchar(100) NOT NULL UNIQUE, name varchar(100) NOT NULL, email varchar(255) NOT NULL, role user_role NOT NULL DEFAULT 'student', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE files (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), original_name varchar(255) NOT NULL, mime_type varchar(100) NOT NULL, size int NOT NULL, storage_key text NOT NULL, public_url text, access_level file_access_level NOT NULL DEFAULT 'private', created_by_user_id uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE visitor_profiles (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), age_group contact_age_group NOT NULL, visitor_type contact_visitor_type NOT NULL, business_card_file_id uuid REFERENCES files(id), business_card_registered boolean NOT NULL DEFAULT false, ocr_raw_text text, ocr_name varchar(100), ocr_organization varchar(150), ocr_position varchar(100), ocr_email varchar(255), ocr_phone varchar(50), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT visitor_profile_recruiter_card CHECK (visitor_type <> 'recruiter' OR business_card_file_id IS NOT NULL))`);
    await queryRunner.query(`CREATE TABLE projects (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), service_name varchar(100) NOT NULL, team_name varchar(100) NOT NULL, description text, thumbnail_file_id uuid REFERENCES files(id), development_stacks text[] NOT NULL DEFAULT '{}'::text[], design_stacks text[] NOT NULL DEFAULT '{}'::text[], is_published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz)`);
    await queryRunner.query(`CREATE TABLE project_members (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, display_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT project_members_unique UNIQUE (project_id, user_id))`);
    await queryRunner.query(`CREATE TABLE feedback (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, content text NOT NULL, status feedback_status NOT NULL, moderation_reason text, ip_hash varchar(255), user_agent text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE contacts (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, visitor_profile_id uuid NOT NULL REFERENCES visitor_profiles(id) ON DELETE RESTRICT, target_member_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, age_group contact_age_group NOT NULL, visitor_type contact_visitor_type NOT NULL, name varchar(100), organization varchar(150), position varchar(100), email varchar(255), phone varchar(50), memo text, business_card_file_id uuid REFERENCES files(id), ocr_raw_text text, ocr_name varchar(100), ocr_organization varchar(150), ocr_position varchar(100), ocr_email varchar(255), ocr_phone varchar(50), status contact_status NOT NULL DEFAULT 'new', ip_hash varchar(255), user_agent text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE banned_words (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), word varchar(100) NOT NULL UNIQUE, normalized_word varchar(100) NOT NULL UNIQUE, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), actor_user_id uuid REFERENCES users(id), action audit_action NOT NULL, resource_type varchar(50) NOT NULL, resource_id uuid, metadata jsonb, created_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE realtime_events (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), type realtime_event_type NOT NULL, project_id uuid REFERENCES projects(id), target_role user_role, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE event_outbox (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), topic varchar(120) NOT NULL, event_key varchar(120), event_type varchar(120) NOT NULL, aggregate_type varchar(80) NOT NULL, aggregate_id uuid, payload jsonb NOT NULL, status outbox_status NOT NULL DEFAULT 'pending', retry_count int NOT NULL DEFAULT 0, last_error text, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX idx_projects_published_created ON projects(is_published, created_at DESC) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_project_members_user_project ON project_members(user_id, project_id)`);
    await queryRunner.query(`CREATE INDEX idx_feedback_project_status_created ON feedback(project_id, status, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_feedback_status_created ON feedback(status, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_feedback_content_trgm ON feedback USING gin (to_tsvector('simple', content))`);
    await queryRunner.query(`CREATE INDEX idx_contacts_project_status_created ON contacts(project_id, status, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_contacts_target_created ON contacts(target_member_user_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_contacts_search ON contacts USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '')))`);
    await queryRunner.query(`CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_realtime_project_created ON realtime_events(project_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_outbox_status_created ON event_outbox(status, created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_status_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_realtime_project_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_resource`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_target_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_project_status_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedback_content_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedback_status_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedback_project_status_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_members_user_project`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_published_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS event_outbox`);
    await queryRunner.query(`DROP TABLE IF EXISTS realtime_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS banned_words`);
    await queryRunner.query(`DROP TABLE IF EXISTS contacts`);
    await queryRunner.query(`DROP TABLE IF EXISTS feedback`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS visitor_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS files`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TYPE IF EXISTS outbox_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS realtime_event_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS audit_action`);
    await queryRunner.query(`DROP TYPE IF EXISTS file_access_level`);
    await queryRunner.query(`DROP TYPE IF EXISTS contact_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS feedback_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS contact_visitor_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS contact_age_group`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
  }
}
