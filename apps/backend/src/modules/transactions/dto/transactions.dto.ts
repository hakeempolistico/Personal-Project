import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Account ID' })
  @IsString()
  accountId: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ enum: TransactionType, description: 'Transaction type' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Currency code (e.g., USD, PHP)', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Transaction description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Transaction date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Is recurring' })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Linked Bill ID (for bill payments)' })
  @IsString()
  @IsOptional()
  billId?: string;

  @ApiPropertyOptional({ description: 'Linked Loan Payment ID (for loan payments)' })
  @IsString()
  @IsOptional()
  loanPaymentId?: string;

  @ApiPropertyOptional({ description: 'Destination Account ID (for transfers only)' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.type === TransactionType.TRANSFER)
  toAccountId?: string;
}

export class CreateTransferDto {
  @ApiProperty({ description: 'Source Account ID (where money is transferred from)' })
  @IsString()
  fromAccountId: string;

  @ApiProperty({ description: 'Destination Account ID (where money is transferred to)' })
  @IsString()
  toAccountId: string;

  @ApiProperty({ description: 'Transfer amount' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Currency code (e.g., USD, PHP)', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Transfer description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Transfer date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTransactionDto {
  @ApiPropertyOptional({ description: 'Account ID' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Amount' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Date' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
