import { Module } from '@nestjs/common';
import { PlaceholderController } from './loans.controller';
import { PlaceholderService } from './loans.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class LoansModule {}
