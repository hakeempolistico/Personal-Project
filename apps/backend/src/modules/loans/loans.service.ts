import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateLoanDto, MakePaymentDto } from './dto/loans.dto';

@Injectable()
export class LoansService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async create(userId: string, dto: CreateLoanDto) {
    const currency = await this.settingsService.getCurrency(userId);
    return this.prisma.loan.create({
      data: {
        name: dto.name,
        type: dto.type,
        principal: dto.principal,
        currency,
        interestRate: dto.interestRate,
        termMonths: dto.termMonths,
        startDate: new Date(dto.startDate),
        remainingBalance: dto.remainingBalance ?? dto.principal,
        accountId: dto.accountId,
        userId,
        isActive: true,
      },
      include: {
        account: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      include: {
        account: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, userId },
      include: {
        account: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            account: true,
            transactions: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }
    return loan;
  }

  async update(id: string, userId: string, dto: Partial<CreateLoanDto>) {
    await this.findOne(id, userId);
    return this.prisma.loan.update({
      where: { id },
      data: dto,
      include: {
        account: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.loan.delete({
      where: { id },
    });
  }

  async makePayment(id: string, userId: string, paymentDto: MakePaymentDto) {
    const loan = await this.findOne(id, userId);

    // Determine which account to use
    const accountId = paymentDto.accountId ?? loan.accountId;

    if (!accountId) {
      throw new BadRequestException('No account specified for loan payment. Please provide an accountId.');
    }

    // Verify account ownership
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== userId) {
      throw new NotFoundException('Account not found');
    }

    // Get currency from settings
    const currency = await this.settingsService.getCurrency(userId);

    const paymentAmount = paymentDto.amount;
    const newBalance = Math.max(0, Number(loan.remainingBalance) - paymentAmount);
    const now = new Date();

    // Create payment record and transaction in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create loan payment record
      const loanPayment = await prisma.loanPayment.create({
        data: {
          loanId: id,
          userId,
          accountId,
          amount: paymentAmount,
          currency,
          balanceAfter: newBalance,
          notes: paymentDto.notes,
        },
        include: {
          account: true,
        },
      });

      // Create the transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          accountId,
          loanPaymentId: loanPayment.id,
          type: 'EXPENSE',
          amount: paymentAmount,
          currency,
          description: `Payment for ${loan.name}`,
          date: now,
          notes: paymentDto.notes || `Loan payment - ${loan.name}`,
        },
        include: {
          account: true,
        },
      });

      // Update account balance
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: Number(account.balance) - paymentAmount,
        },
      });

      // Update loan balance
      const updatedLoan = await prisma.loan.update({
        where: { id },
        data: {
          remainingBalance: newBalance,
          isActive: newBalance > 0,
        },
        include: {
          account: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              account: true,
              transactions: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      });

      return {
        loanPayment,
        transaction,
        loan: updatedLoan,
      };
    });

    return result;
  }

  async getPaymentHistory(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.loanPayment.findMany({
      where: { loanId: id, userId },
      include: {
        account: true,
        transactions: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllTransactions(userId: string, loanId: string) {
    await this.findOne(loanId, userId);

    const payments = await this.prisma.loanPayment.findMany({
      where: { loanId },
      select: { id: true },
    });

    const paymentIds = payments.map(p => p.id);

    return this.prisma.transaction.findMany({
      where: {
        loanPaymentId: { in: paymentIds },
        userId,
      },
      include: {
        account: true,
        loanPayment: true,
      },
      orderBy: { date: 'desc' },
    });
  }
}
