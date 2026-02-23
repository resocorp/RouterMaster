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

  // ── General ──
  @Column({ name: 'disconnect_method', type: 'varchar', length: 20, default: 'nas' })
  disconnectMethod: string;

  @Column({ name: 'hide_limits_in_user_list', type: 'boolean', default: false })
  hideLimitsInUserList: boolean;

  @Column({ name: 'add_new_nas_to_all_services', type: 'boolean', default: true })
  addNewNasToAllServices: boolean;

  @Column({ name: 'add_new_manager_to_all_services', type: 'boolean', default: false })
  addNewManagerToAllServices: boolean;

  @Column({ name: 'disconnect_time_hour', type: 'smallint', default: 23 })
  disconnectTimeHour: number;

  @Column({ name: 'disconnect_time_minute', type: 'smallint', default: 59 })
  disconnectTimeMinute: number;

  // ── Billing ──
  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'vat_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatPercent: number;

  @Column({ name: 'adv_sales_tax', type: 'decimal', precision: 5, scale: 2, default: 0 })
  advSalesTax: number;

  @Column({ name: 'postpaid_renewal_day', type: 'smallint', default: 1 })
  postpaidRenewalDay: number;

  @Column({ name: 'billing_period_start', type: 'smallint', default: 1 })
  billingPeriodStart: number;

  @Column({ name: 'grace_period_days', type: 'smallint', default: 1 })
  gracePeriodDays: number;

  @Column({ name: 'reset_credits_on_service_change', type: 'boolean', default: true })
  resetCreditsOnServiceChange: boolean;

  @Column({ name: 'disconnect_postpaid_at_billing_start', type: 'boolean', default: false })
  disconnectPostpaidAtBillingStart: boolean;

  @Column({ name: 'disable_accounts_unpaid_invoices', type: 'boolean', default: true })
  disableAccountsUnpaidInvoices: boolean;

  @Column({ name: 'disable_accounts_expired_contract', type: 'boolean', default: true })
  disableAccountsExpiredContract: boolean;

  @Column({ name: 'enable_voucher_redemption', type: 'boolean', default: true })
  enableVoucherRedemption: boolean;

  @Column({ name: 'enable_account_recharge', type: 'boolean', default: true })
  enableAccountRecharge: boolean;

  @Column({ name: 'enable_deposit_purchase', type: 'boolean', default: true })
  enableDepositPurchase: boolean;

  // Payment gateways
  @Column({ name: 'gw_internal', type: 'boolean', default: true })
  gwInternal: boolean;

  @Column({ name: 'gw_paypal_standard', type: 'boolean', default: false })
  gwPaypalStandard: boolean;

  @Column({ name: 'gw_paypal_pro', type: 'boolean', default: false })
  gwPaypalPro: boolean;

  @Column({ name: 'gw_paypal_express', type: 'boolean', default: false })
  gwPaypalExpress: boolean;

  @Column({ name: 'gw_netcash', type: 'boolean', default: false })
  gwNetcash: boolean;

  @Column({ name: 'gw_payfast', type: 'boolean', default: false })
  gwPayfast: boolean;

  @Column({ name: 'gw_authorize_net', type: 'boolean', default: false })
  gwAuthorizeNet: boolean;

  @Column({ name: 'gw_dps_payment_express', type: 'boolean', default: false })
  gwDpsPaymentExpress: boolean;

  @Column({ name: 'gw_2checkout', type: 'boolean', default: false })
  gw2Checkout: boolean;

  @Column({ name: 'gw_payu', type: 'boolean', default: false })
  gwPayU: boolean;

  @Column({ name: 'gw_paytm', type: 'boolean', default: false })
  gwPaytm: boolean;

  @Column({ name: 'gw_bkash', type: 'boolean', default: false })
  gwBkash: boolean;

  @Column({ name: 'gw_flutterwave', type: 'boolean', default: false })
  gwFlutterwave: boolean;

  @Column({ name: 'gw_easypay', type: 'boolean', default: false })
  gwEasypay: boolean;

  @Column({ name: 'gw_mpesa', type: 'boolean', default: false })
  gwMpesa: boolean;

  @Column({ name: 'gw_custom', type: 'boolean', default: false })
  gwCustom: boolean;

  // ── Account ──
  @Column({ name: 'lock_first_mac', type: 'boolean', default: false })
  lockFirstMac: boolean;

  @Column({ name: 'ucp_edit_data', type: 'boolean', default: false })
  ucpEditData: boolean;

  @Column({ name: 'ucp_service_change', type: 'varchar', length: 20, default: 'never' })
  ucpServiceChange: string;

  @Column({ name: 'ucp_change_password', type: 'boolean', default: false })
  ucpChangePassword: boolean;

  @Column({ name: 'ucp_redeem_voucher', type: 'boolean', default: true })
  ucpRedeemVoucher: boolean;

  @Column({ name: 'ucp_view_invoices', type: 'boolean', default: true })
  ucpViewInvoices: boolean;

  @Column({ name: 'ucp_recharge', type: 'boolean', default: false })
  ucpRecharge: boolean;

  @Column({ name: 'mandatory_fields', type: 'jsonb', default: [] })
  mandatoryFields: string[];

  // ── Self Reg & IAS ──
  @Column({ name: 'self_reg_enabled', type: 'boolean', default: false })
  selfRegEnabled: boolean;

  @Column({ name: 'self_reg_name_requires_sms', type: 'boolean', default: false })
  selfRegNameRequiresSms: boolean;

  @Column({ name: 'self_reg_name_requires_email', type: 'boolean', default: false })
  selfRegNameRequiresEmail: boolean;

  @Column({ name: 'self_reg_cell_requires_sms', type: 'boolean', default: false })
  selfRegCellRequiresSms: boolean;

  @Column({ name: 'self_reg_mandatory_fields', type: 'jsonb', default: [] })
  selfRegMandatoryFields: string[];

  @Column({ name: 'self_reg_allow_duplicate_email', type: 'boolean', default: false })
  selfRegAllowDuplicateEmail: boolean;

  @Column({ name: 'self_reg_allow_duplicate_cell', type: 'boolean', default: false })
  selfRegAllowDuplicateCell: boolean;

  @Column({ name: 'self_reg_default_sim_use', type: 'smallint', default: 1 })
  selfRegDefaultSimUse: number;

  @Column({ name: 'self_reg_default_user_group', type: 'varchar', length: 100, nullable: true })
  selfRegDefaultUserGroup: string;

  @Column({ name: 'captcha_enabled', type: 'boolean', default: false })
  captchaEnabled: boolean;

  @Column({ name: 'ias_mandatory_fields', type: 'jsonb', default: [] })
  iasMandatoryFields: string[];

  @Column({ name: 'ias_allow_duplicate_email', type: 'boolean', default: false })
  iasAllowDuplicateEmail: boolean;

  @Column({ name: 'ias_allow_duplicate_cell', type: 'boolean', default: false })
  iasAllowDuplicateCell: boolean;

  @Column({ name: 'ias_sms_verification', type: 'boolean', default: false })
  iasSmsVerification: boolean;

  // ── Notifications ──
  @Column({ name: 'notify_manager_on_reg_email', type: 'boolean', default: true })
  notifyManagerOnRegEmail: boolean;

  @Column({ name: 'new_service_plan_email', type: 'boolean', default: true })
  newServicePlanEmail: boolean;

  @Column({ name: 'new_service_plan_sms', type: 'boolean', default: false })
  newServicePlanSms: boolean;

  @Column({ name: 'welcome_email', type: 'boolean', default: true })
  welcomeEmail: boolean;

  @Column({ name: 'welcome_sms', type: 'boolean', default: false })
  welcomeSms: boolean;

  @Column({ name: 'renewal_notification_email', type: 'boolean', default: true })
  renewalNotificationEmail: boolean;

  @Column({ name: 'renewal_notification_sms', type: 'boolean', default: false })
  renewalNotificationSms: boolean;

  @Column({ name: 'expiry_alert_email', type: 'boolean', default: true })
  expiryAlertEmail: boolean;

  @Column({ name: 'expiry_alert_sms', type: 'boolean', default: true })
  expiryAlertSms: boolean;

  @Column({ name: 'alert_level_type', type: 'varchar', length: 20, default: 'percent' })
  alertLevelType: string;

  @Column({ name: 'alert_dl_mb', type: 'decimal', precision: 10, scale: 2, default: 0 })
  alertDlMb: number;

  @Column({ name: 'alert_dl_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  alertDlPercent: number;

  @Column({ name: 'alert_ul_mb', type: 'decimal', precision: 10, scale: 2, default: 0 })
  alertUlMb: number;

  @Column({ name: 'alert_ul_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  alertUlPercent: number;

  @Column({ name: 'alert_total_mb', type: 'decimal', precision: 10, scale: 2, default: 0 })
  alertTotalMb: number;

  @Column({ name: 'alert_total_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  alertTotalPercent: number;

  @Column({ name: 'alert_online_time', type: 'varchar', length: 10, default: '00:00:00' })
  alertOnlineTime: string;

  @Column({ name: 'alert_online_time_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  alertOnlineTimePercent: number;

  @Column({ name: 'alert_expiry_days', type: 'int', default: 3 })
  alertExpiryDays: number;

  @Column({ name: 'alert_send_once', type: 'boolean', default: true })
  alertSendOnce: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
