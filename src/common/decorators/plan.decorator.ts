import { SetMetadata } from '@nestjs/common';
import { PaymentPlanId } from '../enums/payment-plan.enum';

export const PLAN_KEY = 'requiredPlan';
export const RequiresPlan = (plan: PaymentPlanId) => SetMetadata(PLAN_KEY, plan);