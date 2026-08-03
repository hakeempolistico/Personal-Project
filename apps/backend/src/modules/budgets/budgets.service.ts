import { Injectable } from '@nestjs/common';

@Injectable()
export class BudgetsService {
  getBudgets() {
    return { message: 'Feature coming soon' };
  }
}
