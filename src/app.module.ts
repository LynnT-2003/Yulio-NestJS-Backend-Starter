import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtGuard } from './common/guards/jwt.guard';
import { SuspendedUserBlockGuard } from './common/guards/suspended-user-block.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { loadEnvConfigs } from './common/config/env.config';
import { buildMongoUri } from './common/config/mongo-uri-builder';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    // ─── Config ────────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [loadEnvConfigs],
    }),

    // ─── Database ──────────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: buildMongoUri(configService.get('databaseConfig')!),
      }),
    }),

    // ─── Feature Modules ───────────────────────────────────────────────────────
    AuthModule,
    UserModule,
    AdminModule,
    UploadModule,
  ],
  providers: [
    // ─── Global Guards ─────────────────────────────────────────────────────────
    // JwtGuard protects all routes by default — use @Public() to opt out
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    // Suspended users get 403 unless the route is @AllowSuspendedUser()
    {
      provide: APP_GUARD,
      useClass: SuspendedUserBlockGuard,
    },
    // RolesGuard runs after JwtGuard — req.user is already populated
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // ─── Global Filter ─────────────────────────────────────────────────────────
    // Registered here via DI so guards/services can be injected if needed later
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // ─── Global Interceptor ────────────────────────────────────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    @InjectConnection()
    private readonly dbConnection: Connection,
  ) { }

  onModuleInit() {
    this.dbConnection.on('connected', () => {
      this.logger.log(
        `MongoDB connected: ${this.dbConnection.name} (host: ${this.dbConnection.host})`,
      );

      const collections = this.dbConnection.collections;
      const names = Object.keys(collections);
      if (names.length > 0) {
        this.logger.log(`Collections found: ${names.join(', ')}`);
      } else {
        this.logger.warn('No collections found in this database yet.');
      }
    });

    this.dbConnection.on('error', (err) => {
      this.logger.error(`MongoDB connection error: ${err.message}`, err.stack);
    });

    this.dbConnection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });
  }
}