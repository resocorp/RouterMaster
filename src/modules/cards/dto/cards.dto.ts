import { IsString, IsOptional, IsNumber, IsInt, IsUUID, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCardSeriesDto {
  @ApiProperty({ example: 'Promo March' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ['classic', 'refill'], default: 'classic' })
  @IsOptional()
  @IsEnum(['classic', 'refill'])
  cardType?: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity: number;

  @ApiPropertyOptional({ example: 'PRO' })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(20)
  pinLength?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(20)
  passwordLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  creditAmount?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  validTill?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  dlLimitMb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ulLimitMb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  totalLimitMb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timeLimitSecs?: number;

  @ApiPropertyOptional({ enum: ['fixed', 'from_activation'], default: 'fixed' })
  @IsOptional()
  @IsEnum(['fixed', 'from_activation'])
  expiryMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  activationTimeSecs?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  simUse?: number;
}

export class ActivateCardDto {
  @ApiProperty({ example: 'PRO12345678' })
  @IsString()
  pin: string;

  @ApiProperty({ example: 'testuser' })
  @IsString()
  username: string;
}
