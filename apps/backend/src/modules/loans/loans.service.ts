import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateLoanDto } from './dto/loans.dto';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateLoanDto) {
    return this.prisma.loan.create({
      data: {
        name: dto.name,
        type: dto.type,
        principal: dto.principal,
        currency: dto.currency || 'USD',
        interestRate: dto.interestRate,
        termMonths: dto.termMonths,
        startDate: new Date(dto.startDate),
        remainingBalance: dto.remainingBalance ?? dto.principal,
        accountId: dto.accountId,
        userId,
        isActive: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, userId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
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
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.loan.delete({
      where: { id },
    });
  }

  async makePayment(id: string, userId: string, amount: number) {
    const loan = await this.findOne(id, userId);
    const newBalance = Math.max(0, Number(loan.remainingBalance) - amount);
    
    // Create payment record
    await this.prisma.loanPayment.create({
      data: {
        loanId: id,
        userId,
        amount,
        balanceAfter: newBalance,
      },
    });

    return this.prisma.loan.update({
      where: { id },
      data: {
        remainingBalance: newBalance,
        isActive: newBalance > 0,
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getPaymentHistory(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.loanPayment.findMany({
      where: { loanId: id, userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
