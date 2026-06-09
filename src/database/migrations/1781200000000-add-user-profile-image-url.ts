import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileImageUrl1781200000000 implements MigrationInterface {
  name = 'AddUserProfileImageUrl1781200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url`);
  }
}
