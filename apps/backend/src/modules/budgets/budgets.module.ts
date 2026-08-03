import { Module } from '@nestjs/common';
import { PlaceholderController } from './budgets.controller';
import { PlaceholderService } from './budgets.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class BudgetsModule {}
