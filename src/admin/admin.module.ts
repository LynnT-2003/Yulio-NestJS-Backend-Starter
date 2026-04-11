import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';
import { AdminModerationController } from './admin-moderation.controller';

@Module({
  imports: [UserModule],
  controllers: [AdminModerationController],
})
export class AdminModule { }
