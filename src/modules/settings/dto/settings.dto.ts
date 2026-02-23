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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disconnectMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  vatPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  postpaidRenewalDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  billingPeriodStart?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  gracePeriodDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  selfRegEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selfRegActivation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  selfRegFields?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  captchaEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ucpEditData?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ucpServiceChange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ucpChangePassword?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ucpRedeemVoucher?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ucpViewInvoices?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ucpRecharge?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lockFirstMac?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  iasSmsVerification?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alertLevelType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  alertDl?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  alertUl?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  alertTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  alertTimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  alertExpiryDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertSendOnce?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gwInternal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gwStripe?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gwPaystack?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gwFlutterwave?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gwPaypal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyManagerOnReg?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  welcomeEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  welcomeSms?: boolean;
}
