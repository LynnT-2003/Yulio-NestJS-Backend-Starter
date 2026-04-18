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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { PaymentService } from './payment.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ICurrentUser } from '../common/interfaces/user.interface';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateBillingPortalSessionDto } from './dto/create-billing-portal-session.dto';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── Checkout ───────────────────────────────────────────────────────────────

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
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
  getUserPlan(@CurrentUser() user: ICurrentUser) {
    return this.paymentService.getUserPlan(user.userId);
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody!, signature);
  }
}
