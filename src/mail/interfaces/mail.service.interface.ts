export interface IMailService {
  sendVerificationEmail(
    to: string,
    displayName: string,
    rawToken: string,
  ): Promise<void>;
}