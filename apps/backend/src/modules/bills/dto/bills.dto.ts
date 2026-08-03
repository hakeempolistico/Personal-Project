import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillFrequency } from '@prisma/client';
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBillDto {
  @ApiProperty({ description: 'Bill name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Bill amount' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code (e.g., USD, PHP)', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Day of month the bill is due (1-31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  dueDay: number;

  @ApiProperty({ enum: BillFrequency, description: 'Billing frequency' })
  @IsEnum(BillFrequency)
  frequency: BillFrequency;

  @ApiPropertyOptional({ description: 'Category ID for this bill' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Account ID to pay bill from' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBillDto {
  @ApiPropertyOptional({ description: 'Bill name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Bill amount' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Day of month' })
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  @IsOptional()
  dueDay?: number;

  @ApiPropertyOptional({ enum: BillFrequency, description: 'Frequency' })
  @IsEnum(BillFrequency)
  @IsOptional()
  frequency?: BillFrequency;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Account ID' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class PayBillDto {
  @ApiPropertyOptional({ description: 'Payment amount (defaults to bill amount)' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Account ID to pay from (required if bill has no default account)' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Notes for the transaction' })
  @IsString()
  @IsOptional()
  notes?: string;
}
