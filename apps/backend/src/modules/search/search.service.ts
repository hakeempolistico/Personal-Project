import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {
  search(query: string) {
    return { message: 'Feature coming soon' };
  }
}
