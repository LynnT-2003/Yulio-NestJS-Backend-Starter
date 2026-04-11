import { AppEnvironment, EnvironmentConfigs } from './types/env';

export function loadEnvConfigs(): EnvironmentConfigs {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001'
  )
    .split(',')
    .map((o) => o.trim());

  return {
    appConfig: {
      appEnvironment:
        (process.env.APP_ENVIRONMENT as AppEnvironment) || 'Development',
      authTokenSecret: process.env.AUTH_TOKEN_SECRET,
      authRefreshTokenSecret: process.env.AUTH_REFRESH_TOKEN_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      resetPasswordSecret: process.env.RESET_PASSWORD_SECRET,
    },
    serverConfig: {
      port: Number(process.env.PORT) || 8080,
      allowedOrigins,
      rateLimit: {
        timeframeInSeconds: Number(process.env.RATE_LIMIT_TIMEFRAME_SECONDS) || 60,
        maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
      },
      baseUrl: process.env.BASE_URL || 'http://localhost:8080',
      frontendOauthCallbackUrl: (process.env.FRONTEND_OAUTH_CALLBACK_URL || '').trim(),
    },
    databaseConfig: {
      username: process.env.MONGO_USERNAME ?? '',
      password: process.env.MONGO_PASSWORD ?? '',
      clusterUrl: process.env.MONGO_CLUSTER_URI ?? '',
      appDatabaseName: process.env.MONGO_DB_NAME ?? '',
    },
    corsConfig: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
      ],
    },
  };
}
