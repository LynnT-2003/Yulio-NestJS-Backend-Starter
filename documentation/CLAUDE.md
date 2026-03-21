# CLAUDE.md

This file is read automatically by Claude Code at the start of every session. It defines the architecture, conventions, and rules for this codebase. Follow everything here exactly.

> For environment variables, Google OAuth, MongoDB Atlas, and Vercel deployment — see **README.md**.

---

## What this project is

A production-ready NestJS REST API boilerplate with:

- MongoDB via Mongoose
- JWT authentication (access token 15m + refresh token 30d)
- Local (email + password) and Google OAuth login
- Role-based access control (USER | ADMIN)
- Swagger UI at `/api/docs`
- Deployed on Vercel (serverless)

---

## Tech stack

```
Runtime:        Node.js + TypeScript
Framework:      NestJS 11
Database:       MongoDB via @nestjs/mongoose + Mongoose
Auth:           Passport.js (local, google-oauth20, jwt strategies)
Tokens:         @nestjs/jwt — access + refresh token rotation
Validation:     class-validator + class-transformer
API Docs:       Swagger (OpenAPI 3.0) via @nestjs/swagger
Deployment:     Vercel (@vercel/node serverless)
Testing:        Jest + @nestjs/testing
```

---

## Folder structure

```
src/
├── main.ts                              Entry point — Vercel handler + local dev
├── app.module.ts                        Root module — global guards, config, MongoDB
├── app.controller.ts                    Health check
├── app.service.ts
│
├── configs/                             All configuration
│   ├── env.config.ts                    loadEnvConfigs() — single source for all env vars
│   ├── api-docs.config.ts              buildAPIDocs() — Swagger/OpenAPI setup
│   ├── mongo-uri-builder.ts            buildMongoUri() — assembles connection string
│   ├── db-connection-names.ts          Named connection constants (multi-DB ready)
│   └── types/
│       └── env.ts                      TypeScript types for config sections
│
├── common/                              Shared across ALL modules
│   ├── enums/
│   │   ├── user-role.enum.ts            UserRole: USER | ADMIN
│   │   ├── oauth-provider.enum.ts       OAuthProviderType: GOOGLE | LOCAL
│   │   └── index.ts
│   ├── interfaces/
│   │   ├── user.interface.ts            IUser, IUserPublic, ICurrentUser
│   │   ├── auth.interface.ts            IJwtPayload, IAuthTokens, IAuthResponse
│   │   └── index.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts    @CurrentUser() — reads req.user
│   │   ├── public.decorator.ts          @Public() — skips JwtGuard
│   │   └── roles.decorator.ts           @Roles() — sets required role
│   ├── guards/
│   │   ├── jwt.guard.ts                 Global — all routes protected unless @Public()
│   │   └── roles.guard.ts              Global — enforces @Roles()
│   ├── strategies/
│   │   └── jwt.strategy.ts              Validates Bearer token → attaches ICurrentUser
│   ├── filters/
│   │   └── http-exception.filter.ts     Shapes all error responses
│   ├── interceptors/
│   │   └── transform.interceptor.ts     Wraps responses in { success, data, timestamp }
│   └── pipes/
│       └── validation.pipe.ts           Global DTO validation
│
├── auth/
│   ├── interfaces/
│   │   └── auth.service.interface.ts    IAuthService contract
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   └── index.ts
│   ├── strategies/
│   │   ├── local.strategy.ts            Email + password
│   │   └── google.strategy.ts           OAuth 2.0
│   ├── guards/
│   │   ├── local.guard.ts
│   │   ├── google.guard.ts
│   │   └── google-callback.guard.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
│
└── user/
    ├── interfaces/
    │   └── user.service.interface.ts     IUserService contract
    ├── entity/
    │   └── user.entity.ts               Mongoose schema + subdocuments
    ├── dto/
    │   ├── update-user.dto.ts
    │   ├── oauth-user.dto.ts            Internal — Passport → service
    │   └── index.ts
    ├── user.service.ts
    ├── user.controller.ts
    └── user.module.ts
```

---

## Rules — follow these exactly

### 1. Every new module follows this structure

```
src/your-module/
  entity/
    your-module.entity.ts
  interfaces/
    your-module.service.interface.ts
  dto/
    create-your-module.dto.ts
    update-your-module.dto.ts
    index.ts
  your-module.service.ts
  your-module.controller.ts
  your-module.module.ts
```

Then import the module into `app.module.ts` imports array.

### 2. Entity conventions

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'your_collection' })
export class YourEntity {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;
}

export const YourEntitySchema = SchemaFactory.createForClass(YourEntity);
export type YourEntityDocument = YourEntity & Document;
```

- Always export three things: the class, the schema, and the Document type.
- Always use `timestamps: true`.
- References use `Types.ObjectId`, not strings.
- Never embed arrays that grow unboundedly — use a separate collection.

### 3. Service interface conventions

Always define the interface before writing the service:

```typescript
import { Types } from 'mongoose';

export interface IYourModuleService {
  findById(id: string | Types.ObjectId): Promise<YourEntityDocument | null>;
  findAllForUser(userId: string): Promise<YourEntityDocument[]>;
  create(userId: string, dto: CreateDto): Promise<YourEntityDocument>;
  update(userId: string, id: string, dto: UpdateDto): Promise<YourEntityDocument>;
  remove(userId: string, id: string): Promise<void>;
}
```

### 4. Service conventions

```typescript
@Injectable()
export class YourService implements IYourModuleService {
  constructor(
    @InjectModel(YourEntity.name)
    private readonly yourModel: Model<YourEntityDocument>,
  ) {}

  async findAllForUser(userId: string): Promise<YourEntityDocument[]> {
    return this.yourModel.find({ owner: userId }).exec();
  }

  async update(userId: string, id: string, dto: UpdateDto): Promise<YourEntityDocument> {
    const doc = await this.yourModel.findById(id);
    if (!doc) throw new NotFoundException('Not found');
    if (doc.owner.toString() !== userId) throw new ForbiddenException();
    return this.yourModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
  }

  async remove(userId: string, id: string): Promise<void> {
    const doc = await this.yourModel.findById(id);
    if (!doc) throw new NotFoundException('Not found');
    if (doc.owner.toString() !== userId) throw new ForbiddenException();
    await this.yourModel.findByIdAndDelete(id);
  }
}
```

- Always scope queries to the requesting user.
- Always verify ownership before mutating.

### 5. Controller conventions

```typescript
@ApiTags('your-module')
@ApiBearerAuth('JWT-auth')
@Controller('your-module')
export class YourController {
  constructor(private readonly yourService: YourService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@CurrentUser() user: ICurrentUser, @Body() dto: CreateDto) {
    return this.yourService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all items for current user' })
  findAll(@CurrentUser() user: ICurrentUser) {
    return this.yourService.findAllForUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item by ID' })
  findOne(@CurrentUser() user: ICurrentUser, @Param('id') id: string) {
    return this.yourService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update item' })
  update(
    @CurrentUser() user: ICurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateDto,
  ) {
    return this.yourService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete item' })
  remove(@CurrentUser() user: ICurrentUser, @Param('id') id: string) {
    return this.yourService.remove(user.userId, id);
  }
}
```

- All routes are JWT-protected globally — never add `@UseGuards(JwtGuard)`.
- Use `@Public()` only for unauthenticated routes.
- Always add `@ApiTags`, `@ApiBearerAuth('JWT-auth')`, and `@ApiOperation` for Swagger.

### 6. DTO conventions

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateYourModuleDto {
  @ApiProperty({ example: 'My Project' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'A brief description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateYourModuleDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
```

- Always add `@ApiProperty` (required fields) or `@ApiPropertyOptional` (optional fields) with `example` values.
- Update DTOs: all fields optional.

### 7. Module conventions

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: YourEntity.name, schema: YourEntitySchema },
    ]),
  ],
  controllers: [YourController],
  providers: [YourService],
  exports: [YourService],
})
export class YourModule {}
```

---

## Configuration

All environment variables are loaded once via `loadEnvConfigs()` in `src/configs/env.config.ts`, registered through `ConfigModule.forRoot({ load: [loadEnvConfigs] })` in `app.module.ts`.

Access config in services:

```typescript
constructor(private readonly configService: ConfigService) {}

// Access nested config
const port = this.configService.get('serverConfig').port;
const dbConfig = this.configService.get('databaseConfig');
```

The database URI is built by `buildMongoUri()` in `src/configs/mongo-uri-builder.ts` from four separate env vars (`MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_CLUSTER_URI`, `MONGO_DB_NAME`).

---

## Auth — how it works

```
Every request → JwtGuard (global) → JwtStrategy.validate() → ICurrentUser on req.user
@CurrentUser() → reads req.user → gives { userId, email, role }
@Public()      → skips JwtGuard entirely
@Roles(UserRole.ADMIN) → restricts to ADMIN role
```

Never implement your own auth checks — use the decorators.

---

## API response shape

Never manually wrap responses. `TransformInterceptor` does this automatically.

Success:

```json
{ "success": true, "statusCode": 200, "data": {}, "timestamp": "..." }
```

Error (handled by `HttpExceptionFilter`):

```json
{ "success": false, "statusCode": 404, "message": "Not found", "path": "...", "timestamp": "..." }
```

---

## MongoDB relationship rules

```
Embed when:
  → array is small and bounded (< 20 items max)
  → always read together with parent
  → e.g. providers[], refreshTokens[] inside User

Reference (separate collection) when:
  → array grows without limit
  → queried independently
  → has own lifecycle
  → e.g. Projects, Tasks, Comments
```

---

## Enums

```typescript
// src/common/enums/task-status.enum.ts
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}
```

Add to `src/common/enums/index.ts` barrel export.

---

## Error handling

Always use NestJS built-in exceptions:

```typescript
throw new NotFoundException('Project not found');
throw new ForbiddenException('You do not own this resource');
throw new ConflictException('Already exists');
throw new BadRequestException('Invalid input');
```

Never throw raw `Error` — always use HTTP exceptions so the filter can format the response.

---

## What NOT to do

- Never put business logic in controllers — controllers only call services
- Never return raw `UserDocument` to client — always use `userService.toPublic()`
- Never store raw tokens — always bcrypt hash
- Never use `any` type unless absolutely necessary
- Never embed unbounded arrays inside documents
- Never skip the service interface
- Never add `@UseGuards(JwtGuard)` — it is already global
- Never manually wrap responses in `{ success, data }` — the interceptor does this
- Never access `process.env` directly in services — use `ConfigService`
- Never add new env vars without updating `loadEnvConfigs()` in `src/configs/env.config.ts` and the types in `src/configs/types/env.ts`

---

## main.ts — local vs Vercel

`main.ts` serves two purposes:

- **Local dev:** Creates the NestJS app and calls `app.listen(port)` (runs when `VERCEL` env var is absent)
- **Vercel serverless:** Exports a default handler function that Vercel invokes per request (uses `app.init()` instead of `listen`)

The app is cached across warm Vercel invocations. Both paths share the same setup (CORS, prefix, Swagger, interceptors).

---

## Adding a new feature — checklist

```
□ enum (if needed) → src/common/enums/ → add to index.ts
□ entity → src/your-module/entity/
□ service interface → src/your-module/interfaces/
□ DTOs with @ApiProperty → src/your-module/dto/ → add index.ts barrel
□ service → implements interface, scopes to user, checks ownership
□ controller → @ApiTags, @ApiBearerAuth('JWT-auth'), @CurrentUser()
□ module → MongooseModule.forFeature, export service if other modules need it
□ app.module.ts → add to imports array
□ test in Swagger at /api/docs
```
