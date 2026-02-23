import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID, IsInt, IsNumber, Min, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriberDto {
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsString() password: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['regular', 'mac', 'docsis', 'mikrotik_acl', 'staros_acl', 'card', 'ias']) accountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['active', 'disabled', 'expired']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() macCpe?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() macCm?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() macLock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['pool', 'dhcp', 'static']) ipModeCpe?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() staticIpCpe?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) simUse?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() planId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zip?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vatId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailAlerts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsAlerts?: boolean;
  @ApiPropertyOptional() @IsOptional() customAttrs?: any[];
}
