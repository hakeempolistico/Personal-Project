import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, Min, Max } from 'class-validator';
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
  principal: number;

  @ApiProperty({ description: 'Currency code (e.g., USD, PHP)', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  termMonths: number;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;
}
