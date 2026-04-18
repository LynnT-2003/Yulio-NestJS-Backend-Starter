import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../user/entity/user.entity';
import { Transaction, TransactionSchema } from './entity/transaction.entity';
import { PaymentService } from './payment.service';
import { TransactionService } from './transaction.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, TransactionService],
  exports: [PaymentService, TransactionService],
})
export class PaymentModule {}
