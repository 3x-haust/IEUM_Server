import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessCardBackFiles1781300000000 implements MigrationInterface {
  name = 'AddBusinessCardBackFiles1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE visitor_profiles ADD COLUMN IF NOT EXISTS business_card_back_file_id uuid REFERENCES files(id)`);
    await queryRunner.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_card_back_file_id uuid REFERENCES files(id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS business_card_back_file_id`);
    await queryRunner.query(`ALTER TABLE visitor_profiles DROP COLUMN IF EXISTS business_card_back_file_id`);
  }
}
