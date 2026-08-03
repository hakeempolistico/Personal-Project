import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BillsModule } from './modules/bills/bills.module';
import { LoansModule } from './modules/loans/loans.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { SavingsGoalsModule } from './modules/savings-goals/savings-goals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),

    // Prisma
    PrismaModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    BillsModule,
    LoansModule,
    BudgetsModule,
    SavingsGoalsModule,
    NotificationsModule,
    SearchModule,
    ReportsModule,
    SettingsModule,
  ],
})
export class AppModule {}
