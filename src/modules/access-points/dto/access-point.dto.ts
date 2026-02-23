import { IsString, IsOptional, IsBoolean, IsIP, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccessPointDto {
  @ApiProperty({ example: 'AP-Lobby' })
  @IsString()
  name: string;

  @ApiProperty({ example: '192.168.10.1' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: ['snmp', 'api'], default: 'snmp' })
  @IsOptional()
  @IsString()
  accessMode?: string;

  @ApiPropertyOptional({ default: 'public' })
  @IsOptional()
  @IsString()
  snmpCommunity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiUsername?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAccessPointDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  snmpCommunity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiUsername?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
