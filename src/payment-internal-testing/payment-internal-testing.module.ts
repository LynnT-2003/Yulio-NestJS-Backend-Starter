import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../user/entity/user.entity';
import { PaymentModule } from '../payment/payment.module';
import { PaymentInternalTestingController } from './payment-internal-testing.controller';
import { PaymentInternalTestingService } from './payment-internal-testing.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PaymentModule,
  ],
  controllers: [PaymentInternalTestingController],
  providers: [PaymentInternalTestingService],
})
export class PaymentInternalTestingModule {}
