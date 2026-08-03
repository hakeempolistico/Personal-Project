import { Module } from '@nestjs/common';
import { PlaceholderController } from './bills.controller';
import { PlaceholderService } from './bills.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class BillsModule {}
