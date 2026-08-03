import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  getNotifications() {
    return { message: 'Feature coming soon' };
  }
}
