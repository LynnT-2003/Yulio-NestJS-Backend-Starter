import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { PaymentService } from './payment.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ICurrentUser } from '../common/interfaces/user.interface';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateBillingPortalSessionDto } from './dto/create-billing-portal-session.dto';
import {
  CheckoutSessionResponseDto,
  BillingPortalSessionResponseDto,
  UserPlanResponseDto,
} from './dto/payment-response.dto';
import {
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../common/helpers/swagger.helper';

@ApiExtraModels(CheckoutSessionResponseDto, BillingPortalSessionResponseDto, UserPlanResponseDto)
@ApiTags('Payment')
@ApiBearerAuth('JWT-auth')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── Checkout ───────────────────────────────────────────────────────────────

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  @ApiResponse(ApiSuccessResponse(CheckoutSessionResponseDto))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(400, 'Checkout session has no URL'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  createCheckoutSession(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentService.createCheckoutSession(
      user.userId,
      dto.priceId,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  // ── Billing portal ─────────────────────────────────────────────────────────

  @Post('billing-portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  @ApiResponse(ApiSuccessResponse(BillingPortalSessionResponseDto))
  @ApiResponse(ApiErrorResponse(400, 'No billing account found. Complete a purchase first.'))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  createBillingPortalSession(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateBillingPortalSessionDto,
  ) {
    return this.paymentService.createBillingPortalSession(
      user.userId,
      dto.returnUrl,
    );
  }

  // ── Plan status ────────────────────────────────────────────────────────────

  @Get('plan')
  @ApiOperation({ summary: 'Get current user plan status' })
  @ApiResponse(ApiSuccessResponse(UserPlanResponseDto))
  @ApiResponse(ApiErrorResponse(404, 'User not found'))
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  getUserPlan(@CurrentUser() user: ICurrentUser) {
    return this.paymentService.getUserPlan(user.userId);
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse(ApiErrorResponse(400, 'Invalid webhook signature'))
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody!, signature);
  }
}
