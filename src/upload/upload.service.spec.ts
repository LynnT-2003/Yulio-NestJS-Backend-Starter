import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, BadRequestException } from '@nestjs/common';

const mockSend = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

import { UploadService } from './upload.service';

const makeConfig = (configured: boolean) => ({
  get: jest.fn((key: string) => {
    if (!configured) return undefined;
    const map: Record<string, string> = {
      R2_ACCOUNT_ID: 'acc123',
      R2_ACCESS_KEY_ID: 'kid',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'my-bucket',
      R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
    };
    return map[key];
  }),
});

describe('UploadService', () => {
  describe('when S3 is NOT configured', () => {
    let service: UploadService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UploadService,
          { provide: ConfigService, useValue: makeConfig(false) },
        ],
      }).compile();
      service = module.get(UploadService);
    });

    it('uploadImage throws ServiceUnavailableException', async () => {
      await expect(
        service.uploadImage({ originalname: 'a.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('') } as any),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('deleteImageByUrl throws ServiceUnavailableException', async () => {
      await expect(service.deleteImageByUrl('https://cdn.example.com/images/x.jpg')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('parseManagedImageKey returns null when publicBaseUrl is empty', () => {
      expect(service.parseManagedImageKey('https://cdn.example.com/images/x.jpg')).toBeNull();
    });
  });

  describe('when S3 IS configured', () => {
    let service: UploadService;

    beforeEach(async () => {
      mockSend.mockResolvedValue({});
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UploadService,
          { provide: ConfigService, useValue: makeConfig(true) },
        ],
      }).compile();
      service = module.get(UploadService);
      jest.clearAllMocks();
      mockSend.mockResolvedValue({});
    });

    it('uploadImage calls S3 and returns url and key', async () => {
      const file = { originalname: 'photo.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('data') } as any;
      const result = await service.uploadImage(file);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result.url).toContain('https://cdn.example.com');
      expect(result.key).toContain('images/');
    });

    it('parseManagedImageKey returns key for managed URLs', () => {
      const key = service.parseManagedImageKey('https://cdn.example.com/images/abc.jpg');
      expect(key).toBe('images/abc.jpg');
    });

    it('parseManagedImageKey returns null for external URLs', () => {
      expect(service.parseManagedImageKey('https://other.com/images/abc.jpg')).toBeNull();
    });

    it('parseManagedImageKey returns null for non-images/ path', () => {
      expect(service.parseManagedImageKey('https://cdn.example.com/other/abc.jpg')).toBeNull();
    });

    it('tryDeleteManagedImage no-ops on empty URL', async () => {
      await service.tryDeleteManagedImage('');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('tryDeleteManagedImage calls DeleteObjectCommand on managed URL', async () => {
      await service.tryDeleteManagedImage('https://cdn.example.com/images/abc.jpg');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('deleteImageByUrl throws BadRequestException for external URL', async () => {
      await expect(service.deleteImageByUrl('https://other.com/images/abc.jpg')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deleteImageByUrl deletes and returns { deleted: true }', async () => {
      const result = await service.deleteImageByUrl('https://cdn.example.com/images/abc.jpg');
      expect(result).toEqual({ deleted: true });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
