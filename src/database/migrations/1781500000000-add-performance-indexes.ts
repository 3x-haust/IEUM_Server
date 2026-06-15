import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1781500000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1781500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_projects_active_created ON projects(created_at DESC, id DESC) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_projects_published_category_created ON projects(is_published, experience_category, created_at DESC, id DESC) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_projects_booth_slot_active ON projects(booth_slot) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_project_members_user_display ON project_members(user_id, display_order)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_project_members_project_display ON project_members(project_id, display_order)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_feedback_not_deleted_created ON feedback(created_at DESC, id DESC) WHERE status <> 'deleted'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_feedback_project_public_created_id ON feedback(project_id, created_at DESC, id DESC) WHERE status = 'public'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_feedback_content_trgm_search ON feedback USING gin (content gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_not_deleted_created ON contacts(created_at DESC, id DESC) WHERE status <> 'deleted'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_project_not_deleted_created ON contacts(project_id, created_at DESC, id DESC) WHERE status <> 'deleted'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_visitor_type_not_deleted_created ON contacts(visitor_type, created_at DESC, id DESC) WHERE status <> 'deleted'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm_search ON contacts USING gin (name gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_organization_trgm_search ON contacts USING gin (organization gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm_search ON contacts USING gin (email gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_phone_trgm_search ON contacts USING gin (phone gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_banned_words_active_word ON banned_words(is_active, word, id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_banned_words_word_trgm_search ON banned_words USING gin (word gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_event_outbox_pending_created ON event_outbox(created_at ASC) WHERE status = 'pending'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_realtime_events_role_created ON realtime_events(target_role, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created ON audit_logs(resource_type, resource_id, created_at DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_resource_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_realtime_events_role_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_outbox_pending_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_banned_words_word_trgm_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_banned_words_active_word`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_phone_trgm_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_email_trgm_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_organization_trgm_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_name_trgm_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_visitor_type_not_deleted_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_project_not_deleted_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contacts_not_deleted_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedback_content_trgm_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedback_project_public_created_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feedback_not_deleted_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_members_project_display`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_members_user_display`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_booth_slot_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_published_category_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_active_created`);
  }
}
