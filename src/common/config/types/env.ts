import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export type AppEnvironment = 'Development' | 'Staging' | 'Production';

export type AppConfig = {
  appEnvironment: AppEnvironment;
  authTokenSecret?: string;
  authRefreshTokenSecret?: string;
  googleClientId?: string;
  resetPasswordSecret?: string;
};

export type ServerConfig = {
  port: number;
  allowedOrigins: string[];
  rateLimit: {
    timeframeInSeconds: number;
    maxRequests: number;
  };
  baseUrl: string;
  /**
   * When set (e.g. https://app.vercel.app/auth/callback), OAuth *success* callbacks
   * redirect here with accessToken, refreshToken, userId in the URL **hash** instead
   * of returning JSON on the API host.
   */
  frontendOauthCallbackUrl: string;
};

export type DatabaseConfig = {
  username: string;
  password: string;
  clusterUrl: string;
  appDatabaseName: string;
};

export type EnvironmentConfigs = {
  appConfig: AppConfig;
  serverConfig: ServerConfig;
  databaseConfig: DatabaseConfig;
  corsConfig: CorsOptions;
};
