import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ias_templates')
export class IasTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string;

  @Column({ name: 'dl_limit_mb', type: 'bigint', default: 0 })
  dlLimitMb: string;

  @Column({ name: 'ul_limit_mb', type: 'bigint', default: 0 })
  ulLimitMb: string;

  @Column({ name: 'total_limit_mb', type: 'bigint', default: 0 })
  totalLimitMb: string;

  @Column({ name: 'time_limit_secs', type: 'int', default: 0 })
  timeLimitSecs: number;

  @Column({ name: 'expiry_date', type: 'timestamptz', nullable: true })
  expiryDate: Date;

  @Column({ name: 'expiry_mode', type: 'enum', enum: ['fixed', 'from_activation'], default: 'from_activation' })
  expiryMode: string;

  @Column({ name: 'activation_time_secs', type: 'int', default: 3600 })
  activationTimeSecs: number;

  @Column({ name: 'sim_use', type: 'int', default: 1 })
  simUse: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
