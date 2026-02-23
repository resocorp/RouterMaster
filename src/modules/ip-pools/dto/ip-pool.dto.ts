import { IsString, IsOptional, IsEnum, IsUUID, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIpPoolDto {
  @ApiProperty({ example: 'Pool-1' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ['radius', 'docsis'], default: 'radius' })
  @IsOptional()
  @IsEnum(['radius', 'docsis'])
  type?: string;

  @ApiProperty({ example: '10.0.0.1' })
  @IsString()
  startIp: string;

  @ApiProperty({ example: '10.0.0.254' })
  @IsString()
  endIp: string;

  @ApiPropertyOptional({ example: '10.0.0.0/24' })
  @IsOptional()
  @IsString()
  subnet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  nextPoolId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateIpPoolDto {
  @ApiPropertyOptional({ example: 'Pool-1' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['radius', 'docsis'] })
  @IsOptional()
  @IsEnum(['radius', 'docsis'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subnet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  nextPoolId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
