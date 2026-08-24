import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PaymentService } from '@/lib/payment/service'
import { formatCurrency } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { checkoutId } = body

    if (!checkoutId) {
      return NextResponse.json(
        { error: 'Checkout ID is required' },
        { status: 400 }
      )
    }

    // Get checkout with approval
    const checkout = await prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: {
        approval: true,
        cart: true,
      },
    })

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    // Update approval status
    if (checkout.approval) {
      await prisma.approval.update({
        where: { id: checkout.approval.id },
        data: {
          status: 'APPROVED',
          approvedBy: 'user',
          approvedAt: new Date(),
        },
      })
    }

    // Update checkout status
    await prisma.checkout.update({
      where: { id: checkoutId },
      data: { status: 'APPROVED' },
    })

    // Create a payment order after approval. The local demo provider is an
    // explicit server-side mode; real Razorpay payments must be completed by
    // its checkout client and verified by the server callback/webhook.
    const paymentOrder = await PaymentService.createPaymentOrder(checkoutId)

    if (paymentOrder.provider === 'demo') {
      const result = await PaymentService.completeDemoPayment(paymentOrder.providerOrderId)

      return NextResponse.json({
        message: `Demo payment successful! Order confirmed: ${result.order.orderNumber}`,
        metadata: {
          orderNumber: result.order.orderNumber,
          orderId: result.order.id,
          total: result.order.total,
          paymentMode: 'demo',
        },
      })
    }

    return NextResponse.json(
      {
        message: 'Purchase approved. Complete payment securely in Razorpay checkout.',
        metadata: {
          paymentId: paymentOrder.paymentId,
          razorpayOrderId: paymentOrder.providerOrderId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          razorpayKey: paymentOrder.key,
          paymentMode: 'razorpay',
        },
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('Error approving checkout:', error)
    return NextResponse.json(
      { error: 'Failed to approve checkout', details: (error as Error).message },
      { status: 500 }
    )
  }
}
