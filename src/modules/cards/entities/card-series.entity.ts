import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('card_series')
export class CardSeries {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  name: string;

  @Column({ name: 'card_type', type: 'enum', enum: ['classic', 'refill'], default: 'classic' })
  cardType: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'gross_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  grossValue: number;

  @Column({ name: 'valid_till', type: 'date', nullable: true })
  validTill: Date;

  @Column({ type: 'varchar', length: 20, default: '' })
  prefix: string;

  @Column({ name: 'pin_length', type: 'smallint', default: 8 })
  pinLength: number;

  @Column({ name: 'password_length', type: 'smallint', default: 6 })
  passwordLength: number;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string;

  @Column({ name: 'dl_limit_mb', type: 'bigint', default: 0 })
  dlLimitMb: string;

  @Column({ name: 'ul_limit_mb', type: 'bigint', default: 0 })
  ulLimitMb: string;

  @Column({ name: 'total_limit_mb', type: 'bigint', default: 0 })
  totalLimitMb: string;

  @Column({ name: 'time_limit_secs', type: 'int', default: 0 })
  timeLimitSecs: number;

  @Column({ name: 'expiry_mode', type: 'enum', enum: ['fixed', 'from_activation'], default: 'fixed' })
  expiryMode: string;

  @Column({ name: 'activation_time_secs', type: 'int', default: 0 })
  activationTimeSecs: number;

  @Column({ name: 'sim_use', type: 'int', default: 1 })
  simUse: number;

  @Column({ name: 'sms_verify', type: 'boolean', default: false })
  smsVerify: boolean;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
