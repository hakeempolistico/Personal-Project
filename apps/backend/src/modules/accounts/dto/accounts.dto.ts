import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @ApiProperty({ description: 'Account name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType, description: 'Account type' })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({ description: 'Initial balance', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  balance?: number;

  @ApiProperty({ description: 'Currency code', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Icon name', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: 'Color hex code', required: false })
  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateAccountDto {
  @ApiProperty({ description: 'Account name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Balance', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  balance?: number;

  @ApiProperty({ description: 'Icon name', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: 'Color hex code', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: 'Archive status', required: false })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
