import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nas_devices')
export class NasDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'ip_address', type: 'inet' })
  ipAddress: string;

  @Column({ type: 'enum', enum: ['mikrotik', 'cisco', 'chillispot', 'staros', 'pfsense', 'other'], default: 'mikrotik' })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  secret: string;

  @Column({ name: 'nas_password', type: 'varchar', length: 255, nullable: true })
  nasPassword: string;

  @Column({ name: 'dynamic_rate', type: 'enum', enum: ['disabled', 'api', 'coa'], default: 'disabled' })
  dynamicRate: string;

  @Column({ name: 'api_username', type: 'varchar', length: 100, nullable: true })
  apiUsername: string;

  @Column({ name: 'api_password', type: 'varchar', length: 255, nullable: true })
  apiPassword: string;

  @Column({ name: 'api_version', type: 'varchar', length: 20, default: '6.45.1+' })
  apiVersion: string;

  @Column({ name: 'cisco_bw', type: 'varchar', length: 20, default: 'none' })
  ciscoBw: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
