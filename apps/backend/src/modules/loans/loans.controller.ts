import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoansService } from './loans.service';
import { CreateLoanDto, MakePaymentDto } from './dto/loans.dto';

@ApiTags('Loans')
@Controller('loans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateLoanDto) {
    return this.loansService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all loans' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.loansService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan by id' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.loansService.findOne(id, user.id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get all transactions for a loan' })
  findAllTransactions(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.loansService.findAllTransactions(user.id, id);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get loan payment history' })
  getPaymentHistory(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.loansService.getPaymentHistory(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update loan' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: Partial<CreateLoanDto>,
  ) {
    return this.loansService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete loan' })
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.loansService.delete(id, user.id);
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Make a loan payment (creates transaction)' })
  makePayment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: MakePaymentDto,
  ) {
    return this.loansService.makePayment(id, user.id, dto);
  }
}
