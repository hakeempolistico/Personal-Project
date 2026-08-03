import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/accounts.dto';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.accountsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by id' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.accountsService.findOne(id, user.id);
  }

  @Get('total')
  @ApiOperation({ summary: 'Get total balance across all accounts' })
  getTotalBalance(@CurrentUser() user: { id: string }) {
    return this.accountsService.getTotalBalance(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.accountsService.remove(id, user.id);
  }
}
