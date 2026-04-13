import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/helpers/swagger.helper';
import { DeleteImageRequestDto } from './dto/upload.dto';
import { DeleteImageResponseDto, UploadImageResponseDto } from './dto/upload.dto';
import { UploadService } from './upload.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@ApiExtraModels(UploadImageResponseDto, DeleteImageResponseDto)
@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload an image to R2 (returns public URL)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse(ApiSuccessResponse(UploadImageResponseDto, 201))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  @ApiResponse(
    ApiErrorResponse(503, 'File uploads are not configured (missing R2 env)'),
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES }),
          new FileTypeValidator({
            // Vercel serverless can't load file-type (ESM-only v21) from a CJS context,
            // so magic-byte detection always throws and the catch block returns false —
            // bypassing fallbackToMimetype entirely. Skip magic numbers and trust the
            // multipart mimetype string instead.
            fileType: /^image\/(jpeg|png|apng|gif|webp)$/i,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(file);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete an uploaded image from R2 by public URL',
  })
  @ApiBody({ type: DeleteImageRequestDto })
  @ApiResponse(ApiSuccessResponse(DeleteImageResponseDto))
  @ApiResponse(
    ApiErrorResponse(400, 'Image URL is not a valid object for this server'),
  )
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  @ApiResponse(
    ApiErrorResponse(503, 'File uploads are not configured (missing R2 env)'),
  )
  deleteImage(@Body() dto: DeleteImageRequestDto) {
    return this.uploadService.deleteImageByUrl(dto.url);
  }
}
