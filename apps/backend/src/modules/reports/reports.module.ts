import { Module } from '@nestjs/common';
import { PlaceholderController } from './reports.controller';
import { PlaceholderService } from './reports.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class ReportsModule {}
