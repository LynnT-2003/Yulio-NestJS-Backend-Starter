import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { buildAPIDocs } from './configs/api-docs.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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