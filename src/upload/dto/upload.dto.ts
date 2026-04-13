import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, MaxLength } from 'class-validator';

export class UploadImageResponseDto {
  @ApiProperty({
    example: 'https://pub-xxxxx.r2.dev/images/uuid.jpg',
  })
  url: string;

  @ApiProperty({ example: 'images/uuid.jpg' })
  key: string;
}

export class DeleteImageRequestDto {
  @ApiProperty({
    example: 'https://pub-xxxxx.r2.dev/images/abc.jpg',
    description:
      'Public URL returned by POST /api/upload. Must be under this app’s R2 base and images/ prefix.',
  })
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url: string;
}


export class DeleteImageResponseDto {
  @ApiProperty({ example: true })
  deleted: boolean;
}

