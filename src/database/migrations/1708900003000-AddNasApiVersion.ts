import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNasApiVersion1708900003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nas_devices
      ADD COLUMN IF NOT EXISTS api_version VARCHAR(20) NOT NULL DEFAULT '6.45.1+'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nas_devices DROP COLUMN IF EXISTS api_version
    `);
  }
}
