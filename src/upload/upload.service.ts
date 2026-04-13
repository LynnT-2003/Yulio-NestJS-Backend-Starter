import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

/** R2 object key prefix for uploads from this app (`images/{uuid}.ext`). */
const MANAGED_IMAGE_PREFIX = 'images';

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/apng': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class UploadService {
  private readonly s3: S3Client | null;
  private readonly bucket: string | undefined;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID')?.trim();
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = this.config
      .get<string>('R2_SECRET_ACCESS_KEY')
      ?.trim();
    this.bucket = this.config.get<string>('R2_BUCKET_NAME')?.trim();
    this.publicBaseUrl =
      this.config.get<string>('R2_PUBLIC_BASE_URL')?.replace(/\/+$/, '') ?? '';

    if (
      !accountId ||
      !accessKeyId ||
      !secretAccessKey ||
      !this.bucket ||
      !this.publicBaseUrl
    ) {
      this.s3 = null;
      return;
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private buildObjectKey(originalName: string, mimetype: string): string {
    const fromOriginal = extname(originalName).toLowerCase();
    const safeExt =
      fromOriginal && /^\.[a-z0-9]{1,8}$/.test(fromOriginal)
        ? fromOriginal
        : (IMAGE_MIME_TO_EXT[mimetype] ?? '');
    return `${MANAGED_IMAGE_PREFIX}/${randomUUID()}${safeExt}`;
  }

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; key: string }> {
    if (!this.s3 || !this.bucket || !this.publicBaseUrl) {
      throw new ServiceUnavailableException(
        'File uploads are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL.',
      );
    }

    const s3 = this.s3;
    const bucket = this.bucket;

    const key = this.buildObjectKey(file.originalname, file.mimetype);
    const input: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    };

    await s3.send(new PutObjectCommand(input));

    const url = `${this.publicBaseUrl}/${encodeURI(key)}`;
    return { url, key };
  }

  /** Returns object key if `url` points at a managed image on this deployment’s public base, else null. */
  parseManagedImageKey(url: string): string | null {
    const base = this.publicBaseUrl.replace(/\/+$/, '');
    const trimmed = url.trim();
    if (!base || !trimmed.startsWith(base)) {
      return null;
    }
    let path = trimmed.slice(base.length).replace(/^\/+/, '');
    try {
      path = decodeURIComponent(path);
    } catch {
      return null;
    }
    if (!path.startsWith(`${MANAGED_IMAGE_PREFIX}/`)) {
      return null;
    }
    return path;
  }

  /** Best-effort delete when replacing an image. Ignores external or unknown URLs. */
  async tryDeleteManagedImage(url: string | undefined): Promise<void> {
    if (!url?.trim() || !this.s3 || !this.bucket) {
      return;
    }
    const key = this.parseManagedImageKey(url);
    if (!key) {
      return;
    }
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /** API: delete by URL; rejects URLs that are not managed images here. */
  async deleteImageByUrl(url: string): Promise<{ deleted: true }> {
    if (!this.s3 || !this.bucket) {
      throw new ServiceUnavailableException(
        'File uploads are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL.',
      );
    }
    const key = this.parseManagedImageKey(url);
    if (!key) {
      throw new BadRequestException(
        'URL is not a valid image object for this server (wrong host or path).',
      );
    }
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return { deleted: true };
  }
}
