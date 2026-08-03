import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ description: 'Day of month the bill is due (1-31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  dueDay: number;

  @ApiProperty({ enum: BillFrequency, description: 'Billing frequency' })
  @IsEnum(BillFrequency)
  frequency: BillFrequency;

  @ApiProperty({ description: 'Is active', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBillDto {
  @ApiProperty({ description: 'Bill name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Bill amount', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Day of month', required: false })
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  @IsOptional()
  dueDay?: number;

  @ApiProperty({ enum: BillFrequency, description: 'Frequency', required: false })
  @IsEnum(BillFrequency)
  @IsOptional()
  frequency?: BillFrequency;

  @ApiProperty({ description: 'Is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
