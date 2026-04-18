import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PaymentPlanId } from '../../common/enums/payment-plan.enum';
import {
  TransactionType,
  TransactionStatus,
} from '../../common/interfaces/transaction.interface';

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  stripeEventId: string;        // unique index — enforces idempotency at DB level too

  @Prop({ required: true })
  stripeCustomerId: string;

  @Prop({ required: true })
  type: TransactionType;

  @Prop({ type: String, enum: PaymentPlanId, required: true })
  plan: PaymentPlanId;

  @Prop({ required: true })
  amount: number;               // cents

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  status: TransactionStatus;
}

export type TransactionDocument = Transaction & Document;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);