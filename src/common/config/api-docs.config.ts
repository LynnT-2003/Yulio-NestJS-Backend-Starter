import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildAPIDocs(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('NestJS API Template')
    .setDescription('API documentation for NestJS API Template')
    .setVersion('1.0')
    .addTag(
      'Auth - Local',
      'Email/password: register, login, token refresh, and logout.',
    )
    .addTag(
      'Auth - Google',
      'Google OAuth 2.0: GET /auth/google redirects to Google; callback returns JWTs.',
    )
    .addTag(
      'Auth - Line',
      'LINE Login: GET /auth/line redirects to LINE; callback returns JWTs (serverless-friendly state).',
    )
    .addTag(
      'Auth - Github',
      'GitHub OAuth: GET /auth/github redirects; callback returns JWTs.',
    )
    .addTag(
      'Auth - Discord',
      'Discord OAuth: GET /auth/discord redirects; callback returns JWTs.',
    )
    .addTag(
      'Auth - Microsoft',
      'Microsoft Entra ID OAuth: GET /auth/microsoft redirects; callback returns JWTs.',
    )
    .addTag('Users', 'Authenticated user profile and admin-only routes.')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      customSiteTitle: 'Yulio API',
      customfavIcon: '/assets/yulio.jpeg',
    },
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
    ],
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
  });
}
