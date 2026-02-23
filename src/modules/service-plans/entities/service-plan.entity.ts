import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../settings/entities/tenant.entity';

@Entity('service_plans')
export class ServicePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'available_ucp', type: 'boolean', default: true })
  availableUcp: boolean;

  @Column({ name: 'plan_type', type: 'enum', enum: ['prepaid', 'prepaid_card', 'postpaid', 'email', 'acl'], default: 'prepaid' })
  planType: string;

  @Column({ name: 'cap_download', type: 'boolean', default: false })
  capDownload: boolean;

  @Column({ name: 'cap_upload', type: 'boolean', default: false })
  capUpload: boolean;

  @Column({ name: 'cap_total', type: 'boolean', default: false })
  capTotal: boolean;

  @Column({ name: 'cap_expiry', type: 'boolean', default: true })
  capExpiry: boolean;

  @Column({ name: 'cap_time', type: 'boolean', default: false })
  capTime: boolean;

  @Column({ name: 'rate_dl', type: 'int', default: 0 })
  rateDl: number;

  @Column({ name: 'rate_ul', type: 'int', default: 0 })
  rateUl: number;

  @Column({ name: 'cisco_policy_dl', type: 'varchar', length: 100, nullable: true })
  ciscoPolicyDl: string;

  @Column({ name: 'cisco_policy_ul', type: 'varchar', length: 100, nullable: true })
  ciscoPolicyUl: string;

  @Column({ name: 'burst_enabled', type: 'boolean', default: false })
  burstEnabled: boolean;

  @Column({ name: 'burst_limit_dl', type: 'int', default: 0 })
  burstLimitDl: number;

  @Column({ name: 'burst_limit_ul', type: 'int', default: 0 })
  burstLimitUl: number;

  @Column({ name: 'burst_thresh_dl', type: 'int', default: 0 })
  burstThreshDl: number;

  @Column({ name: 'burst_thresh_ul', type: 'int', default: 0 })
  burstThreshUl: number;

  @Column({ name: 'burst_time_dl', type: 'int', default: 0 })
  burstTimeDl: number;

  @Column({ name: 'burst_time_ul', type: 'int', default: 0 })
  burstTimeUl: number;

  @Column({ type: 'int', default: 8 })
  priority: number;

  @Column({ name: 'daily_dl_mb', type: 'bigint', default: 0 })
  dailyDlMb: string;

  @Column({ name: 'daily_ul_mb', type: 'bigint', default: 0 })
  dailyUlMb: string;

  @Column({ name: 'daily_total_mb', type: 'bigint', default: 0 })
  dailyTotalMb: string;

  @Column({ name: 'daily_time_secs', type: 'int', default: 0 })
  dailyTimeSecs: number;

  @Column({ name: 'ip_pool', type: 'varchar', length: 100, nullable: true })
  ipPool: string;

  @Column({ name: 'next_disabled_id', type: 'uuid', nullable: true })
  nextDisabledId: string;

  @ManyToOne(() => ServicePlan, { nullable: true })
  @JoinColumn({ name: 'next_disabled_id' })
  nextDisabled: ServicePlan;

  @Column({ name: 'next_expired_id', type: 'uuid', nullable: true })
  nextExpiredId: string;

  @ManyToOne(() => ServicePlan, { nullable: true })
  @JoinColumn({ name: 'next_expired_id' })
  nextExpired: ServicePlan;

  @Column({ name: 'next_daily_id', type: 'uuid', nullable: true })
  nextDailyId: string;

  @ManyToOne(() => ServicePlan, { nullable: true })
  @JoinColumn({ name: 'next_daily_id' })
  nextDaily: ServicePlan;

  @Column({ name: 'ignore_static_ip', type: 'boolean', default: false })
  ignoreStaticIp: boolean;

  @Column({ name: 'custom_attrs', type: 'jsonb', default: [] })
  customAttrs: any[];

  @Column({ name: 'generate_tftp', type: 'boolean', default: false })
  generateTftp: boolean;

  @Column({ name: 'advanced_cm', type: 'text', nullable: true })
  advancedCm: string;

  @Column({ name: 'allowed_nas_ids', type: 'uuid', array: true, default: '{}' })
  allowedNasIds: string[];

  @Column({ name: 'allowed_manager_ids', type: 'uuid', array: true, default: '{}' })
  allowedManagerIds: string[];

  @Column({ name: 'postpaid_calc_dl', type: 'boolean', default: false })
  postpaidCalcDl: boolean;

  @Column({ name: 'postpaid_calc_ul', type: 'boolean', default: false })
  postpaidCalcUl: boolean;

  @Column({ name: 'postpaid_calc_time', type: 'boolean', default: false })
  postpaidCalcTime: boolean;

  @Column({ name: 'is_monthly', type: 'boolean', default: true })
  isMonthly: boolean;

  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean;

  @Column({ name: 'carry_over', type: 'boolean', default: false })
  carryOver: boolean;

  @Column({ name: 'reset_on_expiry', type: 'boolean', default: true })
  resetOnExpiry: boolean;

  @Column({ name: 'reset_on_negative', type: 'boolean', default: false })
  resetOnNegative: boolean;

  @Column({ name: 'additional_credits', type: 'boolean', default: false })
  additionalCredits: boolean;

  @Column({ name: 'net_unit_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  netUnitPrice: number;

  @Column({ name: 'gross_unit_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  grossUnitPrice: number;

  @Column({ name: 'net_add_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  netAddPrice: number;

  @Column({ name: 'gross_add_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  grossAddPrice: number;

  @Column({ name: 'date_add_mode', type: 'enum', enum: ['reset', 'prolong', 'prolong_corrected'], default: 'reset' })
  dateAddMode: string;

  @Column({ name: 'time_add_mode', type: 'enum', enum: ['reset', 'prolong'], default: 'reset' })
  timeAddMode: string;

  @Column({ name: 'traffic_add_mode', type: 'enum', enum: ['reset', 'additive'], default: 'reset' })
  trafficAddMode: string;

  @Column({ name: 'expiry_unit', type: 'varchar', length: 10, default: 'months' })
  expiryUnit: string;

  @Column({ name: 'time_unit', type: 'varchar', length: 10, default: 'minutes' })
  timeUnit: string;

  @Column({ name: 'dl_traffic_unit_mb', type: 'bigint', default: 0 })
  dlTrafficUnitMb: string;

  @Column({ name: 'ul_traffic_unit_mb', type: 'bigint', default: 0 })
  ulTrafficUnitMb: string;

  @Column({ name: 'total_traffic_unit_mb', type: 'bigint', default: 0 })
  totalTrafficUnitMb: string;

  @Column({ name: 'min_base_amount', type: 'decimal', precision: 10, scale: 4, default: 1 })
  minBaseAmount: number;

  @Column({ name: 'min_add_amount', type: 'decimal', precision: 10, scale: 4, default: 1 })
  minAddAmount: number;

  @Column({ name: 'add_traffic_unit_mb', type: 'bigint', default: 0 })
  addTrafficUnitMb: string;

  @Column({ name: 'initial_expiry_val', type: 'int', default: 30 })
  initialExpiryVal: number;

  @Column({ name: 'initial_time_secs', type: 'int', default: 0 })
  initialTimeSecs: number;

  @Column({ name: 'initial_dl_mb', type: 'bigint', default: 0 })
  initialDlMb: string;

  @Column({ name: 'initial_ul_mb', type: 'bigint', default: 0 })
  initialUlMb: string;

  @Column({ name: 'initial_total_mb', type: 'bigint', default: 0 })
  initialTotalMb: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
