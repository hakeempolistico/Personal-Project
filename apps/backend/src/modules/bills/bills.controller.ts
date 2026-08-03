import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillsService } from './bills.service';
import { CreateBillDto, UpdateBillDto, PayBillDto } from './dto/bills.dto';

@ApiTags('Bills')
@Controller('bills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bill' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBillDto) {
    return this.billsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bills' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.billsService.findAll(user.id);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming bills' })
  @ApiQuery({ name: 'days', required: false })
  findUpcoming(
    @CurrentUser() user: { id: string },
    @Query('days') days?: string,
  ) {
    return this.billsService.findUpcoming(user.id, days ? parseInt(days) : 7);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill by id' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.billsService.findOne(id, user.id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get all transactions for a bill' })
  findAllTransactions(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.billsService.findAllTransactions(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bill' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateBillDto,
  ) {
    return this.billsService.update(id, user.id, dto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pay a bill (creates transaction)' })
  payBill(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: PayBillDto,
  ) {
    return this.billsService.payBill(id, user.id, dto);
  }

  @Patch(':id/paid')
  @ApiOperation({ summary: 'Mark bill as paid (without creating transaction)' })
  markAsPaid(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.billsService.markAsPaid(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bill' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.billsService.remove(id, user.id);
  }
}
