import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LoanType } from '@prisma/client';

export class CreateLoanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: LoanType })
  @IsEnum(LoanType)
  type: LoanType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  principal: number;

  @ApiPropertyOptional({ description: 'Currency code (e.g., USD, PHP)', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  interestRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  termMonths: number;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Remaining balance (defaults to principal if not provided)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  remainingBalance?: number;
}
