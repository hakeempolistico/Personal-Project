import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateBillDto, UpdateBillDto, PayBillDto } from './dto/bills.dto';

@Injectable()
export class BillsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async create(userId: string, dto: CreateBillDto) {
    const nextDueAt = this.calculateNextDueDate(dto.dueDay);
    const currency = await this.settingsService.getCurrency(userId);

    return this.prisma.bill.create({
      data: {
        userId,
        name: dto.name,
        amount: dto.amount,
        currency,
        dueDay: dto.dueDay,
        frequency: dto.frequency,
        categoryId: dto.categoryId,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        nextDueAt,
        accountId: dto.accountId,
      },
      include: {
        account: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.bill.findMany({
      where: { userId, isActive: true },
      include: {
        account: true,
      },
      orderBy: { dueDay: 'asc' },
    });
  }

  async findUpcoming(userId: string, days: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const bills = await this.prisma.bill.findMany({
      where: {
        userId,
        isActive: true,
        nextDueAt: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        account: true,
      },
      orderBy: { nextDueAt: 'asc' },
    });

    return bills;
  }

  async findOne(id: string, userId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        account: true,
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return bill;
  }

  async findAllTransactions(userId: string, billId: string) {
    await this.findOne(billId, userId);
    
    return this.prisma.transaction.findMany({
      where: { billId },
      include: {
        account: true,
        category: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateBillDto) {
    await this.findOne(id, userId);

    return this.prisma.bill.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.dueDay !== undefined && { dueDay: dto.dueDay }),
        ...(dto.frequency && { frequency: dto.frequency }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        account: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.bill.delete({
      where: { id },
    });
  }

  async payBill(id: string, userId: string, payDto: PayBillDto) {
    const bill = await this.findOne(id, userId);

    // Determine the payment amount
    const paymentAmount = payDto.amount ?? Number(bill.amount);

    // Determine which account to use
    const accountId = payDto.accountId ?? bill.accountId;

    if (!accountId) {
      throw new BadRequestException('No account specified for bill payment. Please provide an accountId.');
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

    const nextDueAt = this.calculateNextDueDate(bill.dueDay, bill.frequency);
    const now = new Date();

    // Create transaction and update bill in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create the transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          accountId,
          billId: id,
          categoryId: bill.categoryId,
          type: 'EXPENSE',
          amount: paymentAmount,
          currency,
          description: `Payment for ${bill.name}`,
          date: now,
          notes: payDto.notes || `Bill payment - ${bill.name}`,
        },
        include: {
          account: true,
          category: true,
        },
      });

      // Update account balance
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: Number(account.balance) - paymentAmount,
        },
      });

      // Update bill with payment info
      const updatedBill = await prisma.bill.update({
        where: { id },
        data: {
          lastPaidAt: now,
          nextDueAt,
        },
        include: {
          account: true,
          transactions: {
            orderBy: { date: 'desc' },
            take: 5,
            include: {
              account: true,
            },
          },
        },
      });

      return {
        transaction,
        bill: updatedBill,
      };
    });

    return result;
  }

  async markAsPaid(id: string, userId: string) {
    const bill = await this.findOne(id, userId);

    const nextDueAt = this.calculateNextDueDate(bill.dueDay, bill.frequency);

    return this.prisma.bill.update({
      where: { id },
      data: {
        lastPaidAt: new Date(),
        nextDueAt,
      },
      include: {
        account: true,
        transactions: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });
  }

  private calculateNextDueDate(dueDay: number, frequency?: string): Date {
    const now = new Date();
    const currentDay = now.getDate();
    let nextDue = new Date(now.getFullYear(), now.getMonth(), dueDay);

    if (currentDay >= dueDay || frequency === 'YEARLY') {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }

    if (frequency === 'YEARLY') {
      nextDue.setMonth(now.getMonth());
    }

    return nextDue;
  }
}
