import { IsNumber, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCreditsDto {
  @ApiProperty({ description: 'Number of units to add' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ enum: ['cash', 'transfer', 'online'] })
  @IsOptional()
  @IsEnum(['cash', 'transfer', 'online'])
  paymentType?: string = 'cash';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class AddDepositDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ChangeServiceDto {
  @ApiProperty()
  @IsString()
  newPlanId: string;

  @ApiPropertyOptional({ description: 'Schedule date (ISO). If omitted, change is immediate.' })
  @IsOptional()
  @IsString()
  scheduleDate?: string;
}

export class FilterSubscribersDto {
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() macCpe?: string;
  @IsOptional() @IsString() staticIpCpe?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() accountType?: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsString() groupId?: string;
  @IsOptional() @IsString() enabled?: string;
  @IsOptional() @IsNumber() page?: number = 1;
  @IsOptional() @IsNumber() limit?: number = 25;
}
