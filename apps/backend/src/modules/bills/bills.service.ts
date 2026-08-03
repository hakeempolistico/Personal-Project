import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateBillDto, UpdateBillDto } from './dto/bills.dto';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBillDto) {
    const nextDueAt = this.calculateNextDueDate(dto.dueDay);

    return this.prisma.bill.create({
      data: {
        userId,
        name: dto.name,
        amount: dto.amount,
        dueDay: dto.dueDay,
        frequency: dto.frequency,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        nextDueAt,
        accountId: dto.accountId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.bill.findMany({
      where: { userId, isActive: true },
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
      orderBy: { nextDueAt: 'asc' },
    });

    return bills;
  }

  async findOne(id: string, userId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return bill;
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
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.bill.delete({
      where: { id },
    });
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
