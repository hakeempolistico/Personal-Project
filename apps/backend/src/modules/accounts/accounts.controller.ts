import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('PLACEHOLDER')
@Controller('PLACEHOLDER')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlaceholderController {
  @Get()
  @ApiOperation({ summary: 'Placeholder endpoint' })
  getMessage() {
    return { message: 'Feature coming soon' };
  }
}
