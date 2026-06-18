import { MigrationInterface, QueryRunner } from 'typeorm';
import { LEGACY_ITSHOW_SEED_USER_PREFIX, SEED_STUDENT_NAME_USER_PREFIX, SEED_STUDENT_USER_PREFIX, STUDENT_ROSTER, normalizeStudentName } from '../../common/student-roster';

export class ConsolidateSeedStudents1781700000000 implements MigrationInterface {
  name = 'ConsolidateSeedStudents1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMP TABLE _ieum_student_roster (
        name_key text PRIMARY KEY,
        student_number text NOT NULL,
        display_name text NOT NULL
      ) ON COMMIT DROP
    `);
    for (const student of STUDENT_ROSTER) {
      await queryRunner.query(
        `INSERT INTO _ieum_student_roster(name_key, student_number, display_name) VALUES ($1, $2, $3) ON CONFLICT (name_key) DO NOTHING`,
        [normalizeStudentName(student.name), student.studentNumber, student.name]
      );
    }
    await queryRunner.query(`
      CREATE TEMP TABLE _ieum_legacy_seed_targets AS
      SELECT
        legacy.id AS old_user_id,
        regexp_replace(regexp_replace(legacy.name, '^\\s*[0-9]{4}\\s+', ''), '\\s+', '', 'g') AS name_key,
        COALESCE(roster.display_name, legacy.name) AS display_name,
        CASE
          WHEN roster.student_number IS NOT NULL THEN '${SEED_STUDENT_USER_PREFIX}' || roster.student_number
          ELSE '${SEED_STUDENT_NAME_USER_PREFIX}' || substr(md5(regexp_replace(regexp_replace(legacy.name, '^\\s*[0-9]{4}\\s+', ''), '\\s+', '', 'g')), 1, 12)
        END AS canonical_oauth_id
      FROM users legacy
      LEFT JOIN _ieum_student_roster roster
        ON roster.name_key = regexp_replace(regexp_replace(legacy.name, '^\\s*[0-9]{4}\\s+', ''), '\\s+', '', 'g')
      WHERE legacy.oauth_id LIKE '${LEGACY_ITSHOW_SEED_USER_PREFIX}%'
    `);
    await queryRunner.query(`
      CREATE TEMP TABLE _ieum_real_student_claims AS
      SELECT name_key, id AS user_id
      FROM (
        SELECT
          regexp_replace(regexp_replace(name, '^\\s*[0-9]{4}\\s+', ''), '\\s+', '', 'g') AS name_key,
          id,
          COUNT(*) OVER (PARTITION BY regexp_replace(regexp_replace(name, '^\\s*[0-9]{4}\\s+', ''), '\\s+', '', 'g')) AS match_count
        FROM users
        WHERE role = 'student'
          AND oauth_id NOT LIKE '${LEGACY_ITSHOW_SEED_USER_PREFIX}%'
          AND oauth_id NOT LIKE '${SEED_STUDENT_USER_PREFIX}%'
          AND oauth_id NOT LIKE '${SEED_STUDENT_NAME_USER_PREFIX}%'
      ) real_user
      WHERE match_count = 1
    `);
    await queryRunner.query(`
      INSERT INTO users(oauth_provider, oauth_id, name, email, role, created_at, updated_at)
      SELECT DISTINCT
        'mirim_oauth',
        target.canonical_oauth_id,
        target.display_name,
        target.canonical_oauth_id || '@ieum.local',
        'student',
        now(),
        now()
      FROM _ieum_legacy_seed_targets target
      LEFT JOIN _ieum_real_student_claims real_user
        ON real_user.name_key = target.name_key
      WHERE real_user.user_id IS NULL
      ON CONFLICT (oauth_id) DO UPDATE
        SET name = EXCLUDED.name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            updated_at = now()
    `);
    await queryRunner.query(`
      CREATE TEMP TABLE _ieum_seed_user_map AS
      SELECT
        target.old_user_id,
        COALESCE(real_user.user_id, canonical.id) AS new_user_id
      FROM _ieum_legacy_seed_targets target
      LEFT JOIN _ieum_real_student_claims real_user
        ON real_user.name_key = target.name_key
      LEFT JOIN users canonical
        ON canonical.oauth_id = target.canonical_oauth_id
      WHERE COALESCE(real_user.user_id, canonical.id) IS NOT NULL
        AND target.old_user_id <> COALESCE(real_user.user_id, canonical.id)
    `);
    await queryRunner.query(`
      DELETE FROM project_members member
      USING _ieum_seed_user_map mapped
      WHERE member.user_id = mapped.old_user_id
        AND EXISTS (
          SELECT 1
          FROM project_members existing
          WHERE existing.project_id = member.project_id
            AND existing.user_id = mapped.new_user_id
        )
    `);
    await queryRunner.query(`
      UPDATE project_members member
      SET user_id = mapped.new_user_id
      FROM _ieum_seed_user_map mapped
      WHERE member.user_id = mapped.old_user_id
    `);
    await queryRunner.query(`
      UPDATE contacts contact
      SET target_member_user_id = mapped.new_user_id
      FROM _ieum_seed_user_map mapped
      WHERE contact.target_member_user_id = mapped.old_user_id
    `);
    await queryRunner.query(`
      DELETE FROM users legacy
      USING _ieum_seed_user_map mapped
      WHERE legacy.id = mapped.old_user_id
        AND legacy.oauth_id LIKE '${LEGACY_ITSHOW_SEED_USER_PREFIX}%'
        AND NOT EXISTS (SELECT 1 FROM project_members member WHERE member.user_id = legacy.id)
        AND NOT EXISTS (SELECT 1 FROM contacts contact WHERE contact.target_member_user_id = legacy.id)
        AND NOT EXISTS (SELECT 1 FROM files file WHERE file.created_by_user_id = legacy.id)
        AND NOT EXISTS (SELECT 1 FROM audit_logs audit WHERE audit.actor_user_id = legacy.id)
    `);
  }

  public async down(): Promise<void> {
    // The legacy per-project seed users cannot be reconstructed safely once
    // project memberships and contact targets have been consolidated.
  }
}
