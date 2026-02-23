import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserGroupDto {
  @ApiProperty({ example: 'VIP Customers' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Premium tier customers' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateUserGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
