import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly expectedApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.expectedApiKey = this.configService.getOrThrow<string>('API_KEY');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    return typeof apiKey === 'string' && apiKey === this.expectedApiKey;
  }
}
