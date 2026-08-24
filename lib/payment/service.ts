import Razorpay from 'razorpay'
import crypto from 'crypto'
import { prisma } from '../db'
import { generateIdempotencyKey } from '../utils'
import { DecisionLedger } from '../audit/ledger'

type PaymentProvider = 'demo' | 'razorpay'

type PaymentOrder = {
  paymentId: string
  providerOrderId: string
  amount: number
  currency: string
  provider: PaymentProvider
  key?: string
}

export class PaymentService {
  private static hasRazorpayCredentials() {
    return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  }

  private static getRazorpayClient() {
    if (!this.hasRazorpayCredentials()) {
      throw new Error('Razorpay credentials are not configured')
    }

    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  }

  private static toPaymentOrder(payment: {
    id: string
    provider: string
    providerOrderId: string | null
    amount: number
    currency: string
  }): PaymentOrder {
    if (!payment.providerOrderId) {
      throw new Error('Payment provider order is missing')
    }

    return {
      paymentId: payment.id,
      providerOrderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider === 'demo' ? 'demo' : 'razorpay',
      key: payment.provider === 'razorpay' ? process.env.RAZORPAY_KEY_ID : undefined,
    }
  }

  /**
   * Creates a provider order only after the deterministic checkout flow has
   * approved the total. Missing payment credentials select the local demo
   * provider; the demo path is deliberately separate from Razorpay signature
   * verification and is never used when real credentials are present.
   */
  static async createPaymentOrder(checkoutId: string): Promise<PaymentOrder> {
    const checkout = await prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: { cart: true },
    })

    if (!checkout) {
      throw new Error('Checkout not found')
    }

    if (checkout.status !== 'APPROVED') {
      throw new Error('Checkout must be approved before payment')
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { checkoutId },
    })

    if (existingPayment) {
      if (existingPayment.status === 'SUCCESS') {
        throw new Error('Payment already completed')
      }

      return this.toPaymentOrder(existingPayment)
    }

    const idempotencyKey = generateIdempotencyKey(`checkout_${checkoutId}_payment`)

    if (!this.hasRazorpayCredentials()) {
      const providerOrderId = `demo_order_${checkoutId}_${Date.now()}`
      const payment = await prisma.payment.create({
        data: {
          checkoutId,
          provider: 'demo',
          providerOrderId,
          amount: checkout.total,
          currency: checkout.currency,
          status: 'PENDING',
          idempotencyKey,
          metadata: { mode: 'demo', checkoutId },
        },
      })

      await prisma.paymentAttempt.create({
        data: { paymentId: payment.id, status: 'INITIATED' },
      })

      await DecisionLedger.record(
        'PAYMENT_INITIATED',
        'SYSTEM',
        'PAYMENT',
        payment.id,
        { checkoutId, amount: checkout.total, provider: 'demo' }
      )

      return this.toPaymentOrder(payment)
    }

    try {
      const razorpayOrder = await this.getRazorpayClient().orders.create({
        amount: checkout.total,
        currency: checkout.currency,
        receipt: `receipt_${checkoutId}`,
        notes: { checkoutId, cartId: checkout.cartId },
      })

      const payment = await prisma.payment.create({
        data: {
          checkoutId,
          provider: 'razorpay',
          providerOrderId: razorpayOrder.id,
          amount: checkout.total,
          currency: checkout.currency,
          status: 'PENDING',
          idempotencyKey,
          metadata: { razorpayOrder: JSON.parse(JSON.stringify(razorpayOrder)) },
        },
      })

      await prisma.paymentAttempt.create({
        data: { paymentId: payment.id, status: 'INITIATED' },
      })

      await DecisionLedger.record(
        'PAYMENT_INITIATED',
        'SYSTEM',
        'PAYMENT',
        payment.id,
        { checkoutId, amount: checkout.total, provider: 'razorpay' }
      )

      return this.toPaymentOrder(payment)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown payment provider error'
      await DecisionLedger.record(
        'PAYMENT_FAILED',
        'SYSTEM',
        'CHECKOUT',
        checkoutId,
        { error: message, checkoutId }
      )
      throw new Error(`Failed to create Razorpay order: ${message}`)
    }
  }

  /** Verify a browser-provided Razorpay payment signature. */
  static verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret || !signature) return false

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const expectedBuffer = Buffer.from(expected, 'utf8')
    const signatureBuffer = Buffer.from(signature, 'utf8')

    return (
      expectedBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    )
  }

  private static async finalisePayment(
    providerOrderId: string,
    providerPaymentId: string,
    metadata: Record<string, unknown>
  ) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId },
      include: { order: true },
    })

    if (!payment || !payment.checkoutId) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'SUCCESS') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          providerPaymentId,
          metadata: {
            ...(payment.metadata as Record<string, unknown> | null),
            ...metadata,
            verifiedAt: new Date().toISOString(),
          },
        },
      })

      await prisma.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          status: 'SUCCESS',
          metadata: JSON.parse(JSON.stringify(metadata)),
        },
      })

      await DecisionLedger.record(
        'PAYMENT_SUCCESS',
        'SYSTEM',
        'PAYMENT',
        payment.id,
        { providerPaymentId, amount: payment.amount, checkoutId: payment.checkoutId, provider: payment.provider }
      )
    }

    const { CommerceEngine } = await import('../commerce/engine')
    const order = payment.order ?? (await CommerceEngine.createOrder(payment.checkoutId))

    if (!payment.orderId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { orderId: order.id },
      })
    }

    const confirmedOrder = order.status === 'CONFIRMED'
      ? order
      : await CommerceEngine.confirmOrder(order.id)

    const completedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    })

    if (!completedPayment) {
      throw new Error('Payment not found after completion')
    }

    return { payment: completedPayment, order: confirmedOrder }
  }

  /** Handle a verified browser callback from Razorpay. */
  static async handlePaymentSuccess(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    if (!this.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      throw new Error('Invalid payment signature')
    }

    return this.finalisePayment(razorpayOrderId, razorpayPaymentId, {
      razorpayPaymentId,
      razorpaySignature,
    })
  }

  /** Complete a development-only payment created by the explicit demo provider. */
  static async completeDemoPayment(providerOrderId: string) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId, provider: 'demo' },
      select: { id: true },
    })

    if (!payment) {
      throw new Error('Demo payment not found')
    }

    return this.finalisePayment(providerOrderId, `demo_payment_${payment.id}`, {
      mode: 'demo',
    })
  }

  static async handlePaymentFailure(providerOrderId: string, error: string) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId },
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        metadata: {
          ...(payment.metadata as Record<string, unknown> | null),
          error,
          failedAt: new Date().toISOString(),
        },
      },
    })

    await prisma.paymentAttempt.create({
      data: { paymentId: payment.id, status: 'FAILED', error },
    })

    await DecisionLedger.record(
      'PAYMENT_FAILED',
      'SYSTEM',
      'PAYMENT',
      payment.id,
      { providerOrderId, error, checkoutId: payment.checkoutId }
    )

    return payment
  }

  /**
   * Retry a failed payment using the same canonical checkout/payment record.
   * The schema intentionally permits one payment per checkout, while attempts
   * preserve the failure and retry history.
   */
  static async retryPayment(checkoutId: string): Promise<PaymentOrder> {
    const payment = await prisma.payment.findUnique({
      where: { checkoutId },
      include: { attempts: true },
    })

    if (!payment) {
      throw new Error('No existing payment to retry')
    }

    if (payment.status === 'SUCCESS') {
      throw new Error('Payment already successful')
    }

    const provider: PaymentProvider = this.hasRazorpayCredentials() ? 'razorpay' : 'demo'
    let providerOrderId: string
    let metadata: Record<string, unknown>

    if (provider === 'demo') {
      providerOrderId = `demo_order_${checkoutId}_${Date.now()}`
      metadata = { mode: 'demo', retry: true }
    } else {
      const order = await this.getRazorpayClient().orders.create({
        amount: payment.amount,
        currency: payment.currency,
        receipt: `retry_${checkoutId}`,
        notes: { checkoutId, retryPaymentId: payment.id },
      })
      providerOrderId = order.id
      metadata = { razorpayOrder: JSON.parse(JSON.stringify(order)), retry: true }
    }

    const retriedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider,
        providerOrderId,
        providerPaymentId: null,
        status: 'PENDING',
        metadata: JSON.parse(JSON.stringify(metadata)),
      },
    })

    await prisma.paymentAttempt.create({
      data: { paymentId: payment.id, status: 'INITIATED', metadata: { retry: true } },
    })

    await DecisionLedger.record(
      'PAYMENT_RETRY',
      'USER',
      'PAYMENT',
      payment.id,
      { checkoutId, attemptCount: payment.attempts.length + 1, provider }
    )

    return this.toPaymentOrder(retriedPayment)
  }

  static async getPaymentStatus(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        attempts: { orderBy: { createdAt: 'desc' } },
        order: true,
      },
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      attempts: payment.attempts.length,
      order: payment.order
        ? {
            id: payment.order.id,
            orderNumber: payment.order.orderNumber,
            status: payment.order.status,
          }
        : null,
    }
  }

  /** Process a Razorpay webhook after its raw-payload signature was verified. */
  static async processWebhook(payload: any, signature: string) {
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      throw new Error('Razorpay webhook secret is not configured')
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex')

    if (!this.signaturesMatch(expectedSignature, signature)) {
      throw new Error('Invalid webhook signature')
    }

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: 'razorpay',
        eventType: payload.event,
        payload,
        status: 'PENDING',
      },
    })

    try {
      switch (payload.event) {
        case 'payment.captured':
          await this.finalisePayment(
            payload.payload.payment.entity.order_id,
            payload.payload.payment.entity.id,
            { webhookEventId: webhookEvent.id, source: 'razorpay-webhook' }
          )
          break
        case 'payment.failed':
          await this.handlePaymentFailure(
            payload.payload.payment.entity.order_id,
            payload.payload.payment.entity.error_description || 'Payment failed'
          )
          break
        default:
          break
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      })
    } catch (error) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Webhook processing failed',
        },
      })
      throw error
    }
  }

  private static signaturesMatch(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected, 'utf8')
    const receivedBuffer = Buffer.from(received, 'utf8')

    return (
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    )
  }
}
