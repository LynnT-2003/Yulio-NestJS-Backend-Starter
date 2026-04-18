import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITransactionService, ICreateTransactionDto } from './interfaces/transaction.service.interface';
import { ITransaction } from '../common/interfaces/transaction.interface';
import { Transaction, TransactionDocument } from './entity/transaction.entity';

@Injectable()
export class TransactionService implements ITransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) { }

  async create(dto: ICreateTransactionDto): Promise<ITransaction> {
    const transaction = new this.transactionModel(dto);
    await transaction.save();
    const obj = transaction.toObject();
    return { ...obj, userId: String(obj.userId) } as unknown as ITransaction;
  }

  async findByUser(userId: string): Promise<ITransaction[]> {
    return this.transactionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as ITransaction[];
  }

  async existsByStripeEventId(stripeEventId: string): Promise<boolean> {
    const doc = await this.transactionModel
      .exists({ stripeEventId })
      .exec();
    return doc !== null;
  }
}