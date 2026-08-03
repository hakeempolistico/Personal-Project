import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  @Get()
  @ApiOperation({ summary: 'Search across all entities' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  search(@Query('q') query: string) {
    return { message: 'Feature coming soon' };
  }
}
