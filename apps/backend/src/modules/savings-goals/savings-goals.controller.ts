import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Savings Goals')
@Controller('savings-goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavingsGoalsController {
  @Get()
  @ApiOperation({ summary: 'Get all savings goals' })
  getSavingsGoals() {
    return { message: 'Feature coming soon' };
  }
}
