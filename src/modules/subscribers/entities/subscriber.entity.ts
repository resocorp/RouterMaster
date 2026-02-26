import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../settings/entities/tenant.entity';
import { ServicePlan } from '../../service-plans/entities/service-plan.entity';
import { Manager } from '../../managers/entities/manager.entity';
import { UserGroup } from '../../user-groups/entities/user-group.entity';

@Entity('subscribers')
export class Subscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'password_plain', type: 'varchar', length: 255, nullable: true })
  passwordPlain: string;

  @Column({ name: 'account_type', type: 'enum', enum: ['regular', 'mac', 'docsis', 'dhcp_ipoe', 'mikrotik_acl', 'staros_acl', 'card', 'ias'], default: 'regular' })
  accountType: string;

  @Column({ type: 'enum', enum: ['active', 'disabled', 'expired'], default: 'active' })
  status: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'mac_cpe', type: 'varchar', length: 17, nullable: true })
  macCpe: string;

  @Column({ name: 'mac_cm', type: 'varchar', length: 17, nullable: true })
  macCm: string;

  @Column({ name: 'mac_lock', type: 'boolean', default: false })
  macLock: boolean;

  @Column({ name: 'ip_mode_cpe', type: 'enum', enum: ['pool', 'dhcp', 'static'], default: 'pool' })
  ipModeCpe: string;

  @Column({ name: 'ip_mode_cm', type: 'enum', enum: ['pool', 'dhcp', 'static'], default: 'pool' })
  ipModeCm: string;

  @Column({ name: 'static_ip_cpe', type: 'inet', nullable: true })
  staticIpCpe: string;

  @Column({ name: 'static_ip_cm', type: 'inet', nullable: true })
  staticIpCm: string;

  @Column({ name: 'sim_use', type: 'int', default: 1 })
  simUse: number;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string;

  @ManyToOne(() => ServicePlan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: ServicePlan;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string;

  @ManyToOne(() => Manager, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: Manager;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string;

  @ManyToOne(() => UserGroup, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: UserGroup;

  @Column({ name: 'dl_limit_bytes', type: 'bigint', default: 0 })
  dlLimitBytes: string;

  @Column({ name: 'ul_limit_bytes', type: 'bigint', default: 0 })
  ulLimitBytes: string;

  @Column({ name: 'total_limit_bytes', type: 'bigint', default: 0 })
  totalLimitBytes: string;

  @Column({ name: 'time_limit_secs', type: 'int', default: 0 })
  timeLimitSecs: number;

  @Column({ name: 'expiry_date', type: 'timestamptz', nullable: true })
  expiryDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'daily_dl_used', type: 'bigint', default: 0 })
  dailyDlUsed: string;

  @Column({ name: 'daily_ul_used', type: 'bigint', default: 0 })
  dailyUlUsed: string;

  @Column({ name: 'daily_total_used', type: 'bigint', default: 0 })
  dailyTotalUsed: string;

  @Column({ name: 'daily_time_used', type: 'int', default: 0 })
  dailyTimeUsed: number;

  @Column({ name: 'daily_reset_at', type: 'date', nullable: true })
  dailyResetAt: Date;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zip: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mobile: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'vat_id', type: 'varchar', length: 50, nullable: true })
  vatId: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 100, nullable: true })
  contractId: string;

  @Column({ name: 'contract_expiry', type: 'date', nullable: true })
  contractExpiry: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'email_alerts', type: 'boolean', default: true })
  emailAlerts: boolean;

  @Column({ name: 'sms_alerts', type: 'boolean', default: false })
  smsAlerts: boolean;

  @Column({ name: 'alert_sent', type: 'boolean', default: false })
  alertSent: boolean;

  @Column({ name: 'pin_failures', type: 'smallint', default: 0 })
  pinFailures: number;

  @Column({ name: 'verify_failures', type: 'smallint', default: 0 })
  verifyFailures: number;

  @Column({ name: 'sms_sent_count', type: 'int', default: 0 })
  smsSentCount: number;

  @Column({ name: 'custom_attrs', type: 'jsonb', default: [] })
  customAttrs: any[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
