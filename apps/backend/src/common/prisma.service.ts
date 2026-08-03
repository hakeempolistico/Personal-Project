import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    // Clean database in development - use explicit model calls
    return Promise.all([
      this.notification.deleteMany(),
      this.savingsGoal.deleteMany(),
      this.budget.deleteMany(),
      this.loan.deleteMany(),
      this.bill.deleteMany(),
      this.transaction.deleteMany(),
      this.category.deleteMany(),
      this.account.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
