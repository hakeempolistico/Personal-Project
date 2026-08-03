import { Module } from '@nestjs/common';
import { PlaceholderController } from './notifications.controller';
import { PlaceholderService } from './notifications.service';

@Module({
  controllers: [PlaceholderController],
  providers: [PlaceholderService],
})
export class NotificationsModule {}
