import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

import * as nodemailer from 'nodemailer';

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const map: Record<string, string> = {
      MAIL_HOST: 'smtp.example.com',
      MAIL_USER: 'user@example.com',
      MAIL_PASSWORD: 'pass',
      BASE_URL: 'https://example.com',
    };
    if (!(key in map)) throw new Error(`Missing config: ${key}`);
    return map[key];
  }),
  get: jest.fn((key: string) => {
    const map: Record<string, any> = {
      MAIL_PORT: 587,
      COMPANY_NAME: 'TestCo',
      COMPANY_LOGO_URL: '',
      MAIL_FROM: 'noreply@testco.com',
    };
    return map[key] ?? undefined;
  }),
};

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: { sendMail: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(MailService);
    mockTransporter = (nodemailer.createTransport as jest.Mock).mock.results[
      (nodemailer.createTransport as jest.Mock).mock.results.length - 1
    ].value;
    jest.clearAllMocks();
    mockTransporter.sendMail = jest.fn().mockResolvedValue({});
  });

  it('sendVerificationEmail calls sendMail with verify URL', async () => {
    await service.sendVerificationEmail('to@example.com', 'Alice', 'rawtoken123');
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    const call = mockTransporter.sendMail.mock.calls[0][0];
    expect(call.to).toBe('to@example.com');
    expect(call.subject).toContain('Verify');
    expect(call.html).toContain('rawtoken123');
  });

  it('sendWelcomeEmail calls sendMail with welcome subject', async () => {
    await service.sendWelcomeEmail('to@example.com', 'Bob');
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    const call = mockTransporter.sendMail.mock.calls[0][0];
    expect(call.subject).toContain('Welcome');
  });

  it('sendCustomEmail calls sendMail with provided subject', async () => {
    await service.sendCustomEmail('to@example.com', 'My Subject', '<p>hi</p>');
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    const call = mockTransporter.sendMail.mock.calls[0][0];
    expect(call.subject).toBe('My Subject');
  });

  it('rethrows when sendMail rejects', async () => {
    mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));
    await expect(service.sendCustomEmail('to@example.com', 'Sub', 'body')).rejects.toThrow('SMTP error');
  });
});
