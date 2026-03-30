import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailService } from './interfaces/mail.service.interface';
import { verificationEmailContent } from './templates/verification.template';
import { welcomeEmailContent } from './templates/welcome.template';
import { baseEmailTemplate } from './templates/base.template';

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private readonly companyName: string;
  private readonly logoUrl: string;
  private readonly from: string;

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
    this.companyName = this.configService.get<string>('COMPANY_NAME') ?? 'AuthForge';
    // Prefer COMPANY_LOGO_URL (new), fallback to LOGO_URL (legacy)
    this.logoUrl =
      this.configService.get<string>('COMPANY_LOGO_URL') ??
      this.configService.get<string>('LOGO_URL') ??
      '';
    this.from = this.configService.get<string>('MAIL_FROM') ?? `${this.companyName} <noreply@authforge.dev>`;
  }

  // ─── Base send ────────────────────────────────────────────────────────────────

  private async send(to: string, subject: string, content: string): Promise<void> {
    const html = baseEmailTemplate({
      companyName: this.companyName,
      logoUrl: this.logoUrl,
      content,
    });

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent → ${to} [${subject}]`);
    } catch (error) {
      this.logger.error(`Failed to send email → ${to} [${subject}]`, error);
      throw error;
    }
  }

  // ─── Verification ─────────────────────────────────────────────────────────────

  async sendVerificationEmail(
    to: string,
    displayName: string,
    rawToken: string,
  ): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}`;
    const content = verificationEmailContent(displayName, verifyUrl);
    await this.send(to, 'Verify your email address', content);
  }


  // ─── Welcome ──────────────────────────────────────────────────────────────────

  async sendWelcomeEmail(to: string, displayName: string): Promise<void> {
    const content = welcomeEmailContent(displayName);
    await this.send(to, `Welcome to ${this.companyName}`, content);
  }

  // ─── Custom ───────────────────────────────────────────────────────────────────
  // Pass raw HTML content — will be wrapped in the base template automatically

  async sendCustomEmail(
    to: string,
    subject: string,
    content: string,
  ): Promise<void> {
    await this.send(to, subject, content);
  }
}