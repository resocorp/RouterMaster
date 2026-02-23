import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, IsArray, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'My ISP' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateSystemSettingsDto {
  // ── General ──
  @ApiPropertyOptional() @IsOptional() @IsString()
  disconnectMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  hideLimitsInUserList?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  addNewNasToAllServices?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  addNewManagerToAllServices?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  disconnectTimeHour?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  disconnectTimeMinute?: number;

  // ── Billing ──
  @ApiPropertyOptional() @IsOptional() @IsString()
  currency?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  vatPercent?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  advSalesTax?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(28)
  postpaidRenewalDay?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  billingPeriodStart?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  gracePeriodDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  resetCreditsOnServiceChange?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  disconnectPostpaidAtBillingStart?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  disableAccountsUnpaidInvoices?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  disableAccountsExpiredContract?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  enableVoucherRedemption?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  enableAccountRecharge?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  enableDepositPurchase?: boolean;

  // Payment gateways
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwInternal?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwPaypalStandard?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwPaypalPro?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwPaypalExpress?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwNetcash?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwPayfast?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwAuthorizeNet?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwDpsPaymentExpress?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gw2Checkout?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwPayU?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwPaytm?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwBkash?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwFlutterwave?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwEasypay?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwMpesa?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  gwCustom?: boolean;

  // ── Account ──
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  lockFirstMac?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  ucpEditData?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  ucpServiceChange?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  ucpChangePassword?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  ucpRedeemVoucher?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  ucpViewInvoices?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  ucpRecharge?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsArray()
  mandatoryFields?: string[];

  // ── Self Reg & IAS ──
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  selfRegEnabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  selfRegNameRequiresSms?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  selfRegNameRequiresEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  selfRegCellRequiresSms?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsArray()
  selfRegMandatoryFields?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  selfRegAllowDuplicateEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  selfRegAllowDuplicateCell?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  selfRegDefaultSimUse?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  selfRegDefaultUserGroup?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  captchaEnabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsArray()
  iasMandatoryFields?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  iasAllowDuplicateEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  iasAllowDuplicateCell?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  iasSmsVerification?: boolean;

  // ── Notifications ──
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  notifyManagerOnRegEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  newServicePlanEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  newServicePlanSms?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  welcomeEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  welcomeSms?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  renewalNotificationEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  renewalNotificationSms?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  expiryAlertEmail?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  expiryAlertSms?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  alertLevelType?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  alertDlMb?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  alertDlPercent?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  alertUlMb?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  alertUlPercent?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  alertTotalMb?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  alertTotalPercent?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  alertOnlineTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  alertOnlineTimePercent?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  alertExpiryDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  alertSendOnce?: boolean;
}
