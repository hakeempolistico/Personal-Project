import { Module } from '@nestjs/common';
import { PlaceholderController } from './accounts.controller';
import { PlaceholderService } from './accounts.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class AccountsModule {}
