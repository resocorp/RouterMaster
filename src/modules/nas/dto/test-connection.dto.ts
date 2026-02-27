import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestConnectionDto {
  @ApiProperty({ example: '192.168.50.2' })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  apiUsername: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  apiPassword: string;

  @ApiPropertyOptional({ enum: ['pre-6.45.1', '6.45.1+'], default: '6.45.1+' })
  @IsOptional()
  @IsIn(['pre-6.45.1', '6.45.1+'])
  apiVersion?: string;
}
