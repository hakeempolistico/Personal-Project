import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transactions.dto';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.findAll(user.id, accountId, startDate, endDate);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get monthly statistics' })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: true })
  getStats(
    @CurrentUser() user: { id: string },
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.transactionsService.getMonthlyStats(user.id, parseInt(year), parseInt(month));
  }

  @Get('bill/:billId')
  @ApiOperation({ summary: 'Get all transactions for a bill' })
  findByBill(@Param('billId') billId: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.findAllByBill(user.id, billId);
  }

  @Get('loan-payment/:loanPaymentId')
  @ApiOperation({ summary: 'Get all transactions for a loan payment' })
  findByLoanPayment(@Param('loanPaymentId') loanPaymentId: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.findAllByLoanPayment(user.id, loanPaymentId);
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get all transactions for an account (e.g., savings account)' })
  findByAccount(@Param('accountId') accountId: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.findAllBySavingsAccount(user.id, accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by id' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.remove(id, user.id);
  }
}
