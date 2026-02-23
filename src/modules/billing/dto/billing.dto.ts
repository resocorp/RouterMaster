import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  subscriberId: string;

  @ApiProperty({ enum: ['cash', 'transfer', 'online', 'internal', 'card'] })
  @IsEnum(['cash', 'transfer', 'online', 'internal', 'card'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiProperty({ example: 10.0 })
  @IsNumber()
  netPrice: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  vatAmount: number;

  @ApiProperty({ example: 10.0 })
  @IsNumber()
  grossPrice: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
