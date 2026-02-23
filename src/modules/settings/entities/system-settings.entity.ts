import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'disconnect_method', type: 'varchar', length: 20, default: 'nas' })
  disconnectMethod: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'vat_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatPercent: number;

  @Column({ name: 'postpaid_renewal_day', type: 'smallint', default: 1 })
  postpaidRenewalDay: number;

  @Column({ name: 'billing_period_start', type: 'smallint', default: 1 })
  billingPeriodStart: number;

  @Column({ name: 'grace_period_days', type: 'smallint', default: 0 })
  gracePeriodDays: number;

  @Column({ name: 'self_reg_enabled', type: 'boolean', default: false })
  selfRegEnabled: boolean;

  @Column({ name: 'self_reg_activation', type: 'varchar', length: 10, default: 'none' })
  selfRegActivation: string;

  @Column({ name: 'self_reg_fields', type: 'jsonb', default: [] })
  selfRegFields: any[];

  @Column({ name: 'captcha_enabled', type: 'boolean', default: false })
  captchaEnabled: boolean;

  @Column({ name: 'ucp_edit_data', type: 'boolean', default: true })
  ucpEditData: boolean;

  @Column({ name: 'ucp_service_change', type: 'varchar', length: 20, default: 'never' })
  ucpServiceChange: string;

  @Column({ name: 'ucp_change_password', type: 'boolean', default: true })
  ucpChangePassword: boolean;

  @Column({ name: 'ucp_redeem_voucher', type: 'boolean', default: true })
  ucpRedeemVoucher: boolean;

  @Column({ name: 'ucp_recharge', type: 'boolean', default: false })
  ucpRecharge: boolean;

  @Column({ name: 'lock_first_mac', type: 'boolean', default: false })
  lockFirstMac: boolean;

  @Column({ name: 'ias_sms_verification', type: 'boolean', default: false })
  iasSmsVerification: boolean;

  @Column({ name: 'alert_level_type', type: 'varchar', length: 20, default: 'percentage' })
  alertLevelType: string;

  @Column({ name: 'alert_dl', type: 'decimal', precision: 10, scale: 2, default: 80 })
  alertDl: number;

  @Column({ name: 'alert_ul', type: 'decimal', precision: 10, scale: 2, default: 80 })
  alertUl: number;

  @Column({ name: 'alert_total', type: 'decimal', precision: 10, scale: 2, default: 80 })
  alertTotal: number;

  @Column({ name: 'alert_time_minutes', type: 'int', default: 60 })
  alertTimeMinutes: number;

  @Column({ name: 'alert_expiry_days', type: 'int', default: 3 })
  alertExpiryDays: number;

  @Column({ name: 'alert_send_once', type: 'boolean', default: true })
  alertSendOnce: boolean;

  @Column({ name: 'gw_internal', type: 'boolean', default: true })
  gwInternal: boolean;

  @Column({ name: 'gw_stripe', type: 'boolean', default: false })
  gwStripe: boolean;

  @Column({ name: 'gw_paystack', type: 'boolean', default: false })
  gwPaystack: boolean;

  @Column({ name: 'gw_flutterwave', type: 'boolean', default: false })
  gwFlutterwave: boolean;

  @Column({ name: 'gw_paypal', type: 'boolean', default: false })
  gwPaypal: boolean;

  @Column({ name: 'notify_manager_on_reg', type: 'boolean', default: false })
  notifyManagerOnReg: boolean;

  @Column({ name: 'welcome_email', type: 'boolean', default: false })
  welcomeEmail: boolean;

  @Column({ name: 'welcome_sms', type: 'boolean', default: false })
  welcomeSms: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
