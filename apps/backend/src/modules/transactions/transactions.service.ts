import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateTransactionDto, CreateTransferDto, UpdateTransactionDto } from './dto/transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async createTransfer(userId: string, dto: CreateTransferDto) {
    // Verify source account ownership
    const fromAccount = await this.prisma.account.findUnique({
      where: { id: dto.fromAccountId },
    });

    if (!fromAccount || fromAccount.userId !== userId) {
      throw new NotFoundException('Source account not found');
    }

    // Verify destination account ownership
    const toAccount = await this.prisma.account.findUnique({
      where: { id: dto.toAccountId },
    });

    if (!toAccount || toAccount.userId !== userId) {
      throw new NotFoundException('Destination account not found');
    }

    // Ensure source and destination are different
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    // Ensure amount is positive
    if (dto.amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }

    // Get currency from settings
    const currency = await this.settingsService.getCurrency(userId);

    // Use Prisma transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create the debit transaction (money out of source account)
      const debitTransaction = await prisma.transaction.create({
        data: {
          userId,
          accountId: dto.fromAccountId,
          type: 'TRANSFER',
          amount: dto.amount,
          currency,
          description: dto.description || `Transfer to ${toAccount.name}`,
          date: new Date(dto.date),
          notes: dto.notes,
        },
        include: {
          account: true,
        },
      });

      // Create the credit transaction (money into destination account)
      const creditTransaction = await prisma.transaction.create({
        data: {
          userId,
          accountId: dto.toAccountId,
          type: 'TRANSFER',
          amount: dto.amount,
          currency,
          description: dto.description || `Transfer from ${fromAccount.name}`,
          date: new Date(dto.date),
          notes: dto.notes,
        },
        include: {
          account: true,
        },
      });

      // Update source account balance (deduct)
      await prisma.account.update({
        where: { id: dto.fromAccountId },
        data: {
          balance: Number(fromAccount.balance) - dto.amount,
        },
      });

      // Update destination account balance (add)
      await prisma.account.update({
        where: { id: dto.toAccountId },
        data: {
          balance: Number(toAccount.balance) + dto.amount,
        },
      });

      return {
        debitTransaction,
        creditTransaction,
      };
    });

    return {
      transferId: result.debitTransaction.id,
      fromAccount: {
        id: fromAccount.id,
        name: fromAccount.name,
        type: fromAccount.type,
        transactionId: result.debitTransaction.id,
      },
      toAccount: {
        id: toAccount.id,
        name: toAccount.name,
        type: toAccount.type,
        transactionId: result.creditTransaction.id,
      },
      amount: dto.amount,
      currency,
      description: dto.description,
      date: dto.date,
      notes: dto.notes,
    };
  }

  async create(userId: string, dto: CreateTransactionDto) {
    // Verify account ownership
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account || account.userId !== userId) {
      throw new NotFoundException('Account not found');
    }

    // Verify bill ownership if billId is provided
    if (dto.billId) {
      const bill = await this.prisma.bill.findUnique({
        where: { id: dto.billId },
      });
      if (!bill || bill.userId !== userId) {
        throw new NotFoundException('Bill not found');
      }
    }

    // Verify loan payment ownership if loanPaymentId is provided
    if (dto.loanPaymentId) {
      const loanPayment = await this.prisma.loanPayment.findUnique({
        where: { id: dto.loanPaymentId },
        include: { loan: true },
      });
      if (!loanPayment || loanPayment.userId !== userId) {
        throw new NotFoundException('Loan payment not found');
      }
    }

    // Get currency from settings
    const currency = await this.settingsService.getCurrency(userId);

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        billId: dto.billId,
        loanPaymentId: dto.loanPaymentId,
        type: dto.type,
        amount: dto.amount,
        currency,
        description: dto.description,
        date: new Date(dto.date),
        notes: dto.notes,
        isRecurring: dto.isRecurring || false,
      },
      include: {
        account: true,
        category: true,
        bill: true,
        loanPayment: {
          include: {
            loan: true,
          },
        },
      },
    });

    // Update account balance
    const balanceChange = dto.type === 'INCOME' ? dto.amount : -dto.amount;
    await this.prisma.account.update({
      where: { id: dto.accountId },
      data: {
        balance: Number(account.balance) + balanceChange,
      },
    });

    return transaction;
  }

  async findAll(userId: string, accountId?: string, startDate?: string, endDate?: string) {
    const where: any = { userId };
    
    if (accountId) {
      where.accountId = accountId;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        account: true,
        category: true,
        bill: true,
        loanPayment: {
          include: {
            loan: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAllByBill(userId: string, billId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
    });
    if (!bill || bill.userId !== userId) {
      throw new NotFoundException('Bill not found');
    }

    return this.prisma.transaction.findMany({
      where: { billId },
      include: {
        account: true,
        category: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAllByLoanPayment(userId: string, loanPaymentId: string) {
    const loanPayment = await this.prisma.loanPayment.findUnique({
      where: { id: loanPaymentId },
      include: { loan: true },
    });
    if (!loanPayment || loanPayment.userId !== userId) {
      throw new NotFoundException('Loan payment not found');
    }

    return this.prisma.transaction.findMany({
      where: { loanPaymentId },
      include: {
        account: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAllBySavingsAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.transaction.findMany({
      where: { 
        accountId,
        userId,
      },
      include: {
        account: true,
        category: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        category: true,
        bill: true,
        loanPayment: {
          include: {
            loan: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return transaction;
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto) {
    const transaction = await this.findOne(id, userId);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.accountId && { accountId: dto.accountId }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        account: true,
        category: true,
        bill: true,
        loanPayment: {
          include: {
            loan: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const transaction = await this.findOne(id, userId);

    // Reverse the balance change
    const account = await this.prisma.account.findUnique({
      where: { id: transaction.accountId },
    });

    if (account) {
      const balanceChange = transaction.type === 'INCOME' ? -Number(transaction.amount) : Number(transaction.amount);
      await this.prisma.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: Number(account.balance) + balanceChange,
        },
      });
    }

    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async getMonthlyStats(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      income,
      expenses,
      savings: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    };
  }
}
