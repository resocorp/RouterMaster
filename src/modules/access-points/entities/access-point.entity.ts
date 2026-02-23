import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('access_points')
export class AccessPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'ip_address', type: 'inet' })
  ipAddress: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'access_mode', type: 'varchar', length: 10, default: 'snmp' })
  accessMode: string;

  @Column({ name: 'snmp_community', type: 'varchar', length: 100, default: 'public' })
  snmpCommunity: string;

  @Column({ name: 'api_username', type: 'varchar', length: 100, nullable: true })
  apiUsername: string;

  @Column({ name: 'api_password', type: 'varchar', length: 255, nullable: true })
  apiPassword: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
