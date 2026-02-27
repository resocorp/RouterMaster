import { IsString, IsNotEmpty, IsOptional, IsIn, IsIP, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNasDto {
  @ApiProperty({ example: 'Main MikroTik' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '10.0.0.1' })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({ enum: ['mikrotik', 'cisco', 'chillispot', 'staros', 'pfsense', 'other'], default: 'mikrotik' })
  @IsIn(['mikrotik', 'cisco', 'chillispot', 'staros', 'pfsense', 'other'])
  type: string;

  @ApiProperty({ example: 'sharedsecret123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  secret: string;

  @ApiPropertyOptional({ description: 'StarOS only password' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nasPassword?: string;

  @ApiPropertyOptional({ enum: ['disabled', 'api', 'coa'], default: 'disabled' })
  @IsOptional()
  @IsIn(['disabled', 'api', 'coa'])
  dynamicRate?: string;

  @ApiPropertyOptional({ example: 'admin', description: 'Mikrotik API username' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apiUsername?: string;

  @ApiPropertyOptional({ description: 'Mikrotik API password' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  apiPassword?: string;

  @ApiPropertyOptional({ enum: ['pre-6.45.1', '6.45.1+'], default: '6.45.1+' })
  @IsOptional()
  @IsIn(['pre-6.45.1', '6.45.1+'])
  apiVersion?: string;

  @ApiPropertyOptional({ enum: ['none', 'rate-limit', 'policy-map'], default: 'none' })
  @IsOptional()
  @IsIn(['none', 'rate-limit', 'policy-map'])
  ciscoBw?: string;

  @ApiPropertyOptional({ example: 'Primary router' })
  @IsOptional()
  @IsString()
  description?: string;
}
