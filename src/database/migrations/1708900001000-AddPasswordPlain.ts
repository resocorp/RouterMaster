import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordPlain1708900001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE subscribers
      ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE subscribers
      DROP COLUMN IF EXISTS password_plain;
    `);
  }
}
