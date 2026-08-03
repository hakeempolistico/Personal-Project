import { ApiProperty } from '@nestjs/swagger';

export class PlaceholderResponseDto {
  @ApiProperty({ description: 'Feature coming soon' })
  message: string;
}
