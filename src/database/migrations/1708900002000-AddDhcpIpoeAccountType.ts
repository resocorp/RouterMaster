import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDhcpIpoeAccountType1708900002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "account_type" ADD VALUE IF NOT EXISTS 'dhcp_ipoe' AFTER 'docsis'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres does not support removing enum values directly.
    // A full enum recreation would be needed, which is risky in production.
  }
}
