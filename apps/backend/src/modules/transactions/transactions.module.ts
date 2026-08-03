import { Module } from '@nestjs/common';
import { PlaceholderController } from './transactions.controller';
import { PlaceholderService } from './transactions.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class TransactionsModule {}
