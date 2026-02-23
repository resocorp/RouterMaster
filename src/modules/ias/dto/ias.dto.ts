import { IsString, IsOptional, IsInt, IsUUID, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIasTemplateDto {
  @ApiProperty({ example: 'Guest 1-Hour' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dlLimitMb?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ulLimitMb?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalLimitMb?: number;

  @ApiPropertyOptional({ example: 3600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimitSecs?: number;

  @ApiPropertyOptional({ enum: ['fixed', 'from_activation'], default: 'from_activation' })
  @IsOptional()
  @IsEnum(['fixed', 'from_activation'])
  expiryMode?: string;

  @ApiPropertyOptional({ example: 3600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  activationTimeSecs?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  simUse?: number;
}

export class UpdateIasTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['fixed', 'from_activation'])
  expiryMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  activationTimeSecs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  simUse?: number;
}

export class ActivateIasDto {
  @ApiProperty()
  @IsUUID()
  templateId: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsString()
  macAddress: string;
}
