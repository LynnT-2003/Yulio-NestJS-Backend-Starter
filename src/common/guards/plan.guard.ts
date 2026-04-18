import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PLAN_KEY } from '../decorators/plan.decorator';
import { PaymentPlanId } from '../enums/payment-plan.enum';
import { User, UserDocument } from '../../user/entity/user.entity';

const PLAN_RANK: Record<PaymentPlanId, number> = {
  [PaymentPlanId.FREE]: 0,
  [PaymentPlanId.PRO]: 1,
  [PaymentPlanId.LIFETIME]: 2,
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<PaymentPlanId>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest();
    const currentUser = request.user;
    if (!currentUser) throw new ForbiddenException('Authentication required');

    const user = await this.userModel
      .findById(currentUser.userId)
      .select('plan planExpiresAt');

    if (!user) throw new ForbiddenException('User not found');

    if (
      user.plan !== PaymentPlanId.LIFETIME &&
      user.planExpiresAt &&
      user.planExpiresAt < new Date()
    ) {
      throw new ForbiddenException('Your subscription has expired');
    }

    if (PLAN_RANK[user.plan] < PLAN_RANK[requiredPlan]) {
      throw new ForbiddenException(`This feature requires the ${requiredPlan} plan`);
    }

    return true;
  }
}