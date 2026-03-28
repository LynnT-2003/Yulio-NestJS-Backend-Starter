import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from './entity/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepo } from './user.repo';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepo],
  exports: [UserService, UserRepo],
})
export class UserModule { }