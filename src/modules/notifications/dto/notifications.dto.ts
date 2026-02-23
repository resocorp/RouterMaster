import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertNotificationTemplateDto {
  @ApiProperty({ example: 'welcome' })
  @IsString()
  slug: string;

  @ApiProperty({ enum: ['email', 'sms'], example: 'email' })
  @IsEnum(['email', 'sms'])
  channel: string;

  @ApiPropertyOptional({ example: 'Welcome to {{company}}' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Hello {{firstName}}, your account is active.' })
  @IsString()
  body: string;
}

export class SendTestNotificationDto {
  @ApiProperty({ enum: ['email', 'sms'] })
  @IsEnum(['email', 'sms'])
  type: string;

  @ApiProperty({ example: 'test@example.com' })
  @IsString()
  to: string;

  @ApiPropertyOptional({ example: 'Test' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Hello!' })
  @IsString()
  message: string;
}
