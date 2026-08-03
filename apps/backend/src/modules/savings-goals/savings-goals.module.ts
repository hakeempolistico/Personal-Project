import { Module } from '@nestjs/common';
import { PlaceholderController } from './savings-goals.controller';
import { PlaceholderService } from './savings-goals.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class SavingsGoalsModule {}
