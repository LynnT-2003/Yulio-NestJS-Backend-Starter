export interface IMailService {
  sendVerificationEmail(to: string, displayName: string, rawToken: string): Promise<void>;
  sendWelcomeEmail(to: string, displayName: string): Promise<void>;
  sendCustomEmail(to: string, subject: string, content: string): Promise<void>;
}