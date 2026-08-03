import { Module } from '@nestjs/common';
import { PlaceholderController } from './categories.controller';
import { PlaceholderService } from './categories.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class CategoriesModule {}
