import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

const mockUploadService = {
  uploadImage: jest.fn(),
  deleteImageByUrl: jest.fn(),
};

describe('UploadController', () => {
  let controller: UploadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: mockUploadService }],
    }).compile();

    controller = module.get(UploadController);
    jest.clearAllMocks();
  });

  it('uploadImage delegates to uploadService', async () => {
    const file = { originalname: 'a.jpg' } as any;
    mockUploadService.uploadImage.mockResolvedValue({ url: 'https://cdn.example.com/images/a.jpg', key: 'images/a.jpg' });
    const result = await controller.uploadImage(file);
    expect(mockUploadService.uploadImage).toHaveBeenCalledWith(file);
    expect(result).toHaveProperty('url');
  });

  it('deleteImage delegates to uploadService.deleteImageByUrl', async () => {
    mockUploadService.deleteImageByUrl.mockResolvedValue({ deleted: true });
    const result = await controller.deleteImage({ url: 'https://cdn.example.com/images/a.jpg' });
    expect(mockUploadService.deleteImageByUrl).toHaveBeenCalledWith('https://cdn.example.com/images/a.jpg');
    expect(result).toEqual({ deleted: true });
  });
});
