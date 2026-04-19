import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
} from '@nestjs/swagger';

import { PaymentInternalTestingService } from './payment-internal-testing.service';
import { MockOneTimePurchaseDto } from './dto/mock-one-time-purchase.dto';
import {
  MockSubscriptionCreatedDto,
  MockSubscriptionRenewedDto,
} from './dto/mock-subscription.dto';
import {
  MockPurchaseResponseDto,
  MockSubscriptionResponseDto,
  MockResetResponseDto,
  MockPaymentStateResponseDto,
} from './dto/mock-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ICurrentUser } from '../common/interfaces/user.interface';
import {
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../common/helpers/swagger.helper';

@ApiExtraModels(
  MockPurchaseResponseDto,
  MockSubscriptionResponseDto,
  MockResetResponseDto,
  MockPaymentStateResponseDto,
)
@ApiTags('Payment Internal Testing')
@ApiBearerAuth('JWT-auth')
@Controller('payment-internal-testing')
export class PaymentInternalTestingController {
  constructor(private readonly service: PaymentInternalTestingService) {}

  // ── One-time purchase ──────────────────────────────────────────────────────

  @Post('mock-one-time-purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[TESTING] Simulate a completed one-time purchase (e.g. LIFETIME)',
    description:
      'Bypasses Stripe. Directly upgrades the authenticated user\'s plan and creates a transaction record. ' +
      'Equivalent to a `checkout.session.completed` webhook with mode=payment.',
  })
  @ApiResponse(ApiSuccessResponse(MockPurchaseResponseDto))
  @ApiResponse(ApiErrorResponse(400, 'Cannot mock a one-time purchase for the FREE plan'))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  mockOneTimePurchase(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: MockOneTimePurchaseDto,
  ) {
    return this.service.mockOneTimePurchase(user.userId, dto);
  }

  // ── Subscription flows ─────────────────────────────────────────────────────

  @Post('mock-subscription-created')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[TESTING] Simulate a new subscription payment (first invoice.paid)',
    description:
      'Authenticated user must currently be on FREE plan. Activates the given plan with a period end date. ' +
      'Equivalent to the first `invoice.paid` event after a subscription checkout.',
  })
  @ApiResponse(ApiSuccessResponse(MockSubscriptionResponseDto))
  @ApiResponse(ApiErrorResponse(400, 'You already have an active plan — reset first'))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  mockSubscriptionCreated(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: MockSubscriptionCreatedDto,
  ) {
    return this.service.mockSubscriptionCreated(user.userId, dto);
  }

  @Post('mock-subscription-renewed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[TESTING] Simulate a subscription renewal (recurring invoice.paid)',
    description:
      'Authenticated user must already have an active subscription. Extends planExpiresAt to the new period end.',
  })
  @ApiResponse(ApiSuccessResponse(MockSubscriptionResponseDto))
  @ApiResponse(ApiErrorResponse(400, 'No active subscription to renew'))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  mockSubscriptionRenewed(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: MockSubscriptionRenewedDto,
  ) {
    return this.service.mockSubscriptionRenewed(user.userId, dto);
  }

  @Post('mock-subscription-cancelled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[TESTING] Simulate subscription cancellation (customer.subscription.deleted)',
    description:
      'Downgrades the authenticated user to FREE and clears planExpiresAt.',
  })
  @ApiResponse(ApiSuccessResponse(MockSubscriptionResponseDto))
  @ApiResponse(ApiErrorResponse(400, 'User is already on the FREE plan'))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  mockSubscriptionCancelled(@CurrentUser() user: ICurrentUser) {
    return this.service.mockSubscriptionCancelled(user.userId);
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  @Post('reset-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[TESTING] Force-reset your plan back to FREE',
    description:
      'Hard-resets plan to FREE and clears planExpiresAt. Does NOT create a transaction record.',
  })
  @ApiResponse(ApiSuccessResponse(MockResetResponseDto))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  resetPlan(@CurrentUser() user: ICurrentUser) {
    return this.service.resetPlan(user.userId);
  }

  @Get('my-payment-state')
  @ApiOperation({
    summary: '[TESTING] Get your full payment state including all transactions',
  })
  @ApiResponse(ApiSuccessResponse(MockPaymentStateResponseDto))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  getMyPaymentState(@CurrentUser() user: ICurrentUser) {
    return this.service.getUserPaymentState(user.userId);
  }
}
