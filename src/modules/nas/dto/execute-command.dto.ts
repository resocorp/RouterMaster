import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteCommandDto {
  @ApiProperty({ example: '/system/identity/print', description: 'RouterOS API command path' })
  @IsString()
  @IsNotEmpty()
  command: string;

  @ApiPropertyOptional({
    example: { '.proplist': 'name' },
    description: 'Command parameters as key-value pairs',
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, string>;
}
