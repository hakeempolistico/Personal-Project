import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  getCategories() {
    return { message: 'Feature coming soon' };
  }
}
