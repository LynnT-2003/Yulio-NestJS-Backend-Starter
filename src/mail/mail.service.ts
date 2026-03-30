import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailService } from './interfaces/mail.service.interface';
import { verificationEmailTemplate } from './templates/verification.template';

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT') ?? 587,
      secure: false,  // true for 465, false for 587
      auth: {
        user: this.configService.getOrThrow<string>('MAIL_USER'),
        pass: this.configService.getOrThrow<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(
    to: string,
    displayName: string,
    rawToken: string,
  ): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM') ?? 'AuthForge <noreply@authforge.dev>',
        to,
        subject: 'Verify your email address',
        html: verificationEmailTemplate(displayName, verifyUrl),
      });

      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      throw error;
    }
  }
}