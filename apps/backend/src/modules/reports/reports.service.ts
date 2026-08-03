import { Injectable } from '@nestjs/common';

@Injectable()
export class PlaceholderService {
  getMessage() {
    return { message: 'Feature coming soon' };
  }
}
