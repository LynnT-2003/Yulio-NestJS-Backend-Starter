import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { buildAPIDocs } from './common/config/api-docs.config';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // ─── Static Assets ────────────────────────────────────────────────────────────
  app.useStaticAssets(join(__dirname, '..', 'assets'), { prefix: '/assets' });

  // ─── Global Prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors(configService.get('corsConfig'));

  // ─── Trust Proxy (Vercel) ────────────────────────────────────────────────────
  (app as any).set('trust proxy', true);

  // ─── Swagger ─────────────────────────────────────────────────────────────────
  buildAPIDocs(app);

  const port = configService.get('serverConfig').port;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();