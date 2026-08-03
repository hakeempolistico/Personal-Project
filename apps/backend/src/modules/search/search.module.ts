import { Module } from '@nestjs/common';
import { PlaceholderController } from './search.controller';
import { PlaceholderService } from './search.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class SearchModule {}
