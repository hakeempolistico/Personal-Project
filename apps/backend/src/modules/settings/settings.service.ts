import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          currency: 'PHP',
        },
      });
    }

    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          currency: dto.currency || 'PHP',
        },
      });
    } else {
      settings = await this.prisma.userSettings.update({
        where: { userId },
        data: {
          currency: dto.currency,
        },
      });
    }

    return settings;
  }

  async getCurrency(userId: string): Promise<string> {
    const settings = await this.getSettings(userId);
    return settings.currency;
  }
}
