import { prisma } from '../db'

export type AuditEventType =
  | 'AGENT_ACTION'
  | 'POLICY_CHECK'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_RETRY'
  | 'ORDER_CREATED'
  | 'CART_CREATED'
  | 'CART_UPDATED'
  | 'CHECKOUT_CREATED'
  | 'RECOMMENDATION_GENERATED'
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_APPROVED'
  | 'CAMPAIGN_EXECUTED'

export type ActorType = 'USER' | 'AGENT' | 'SYSTEM'

export class DecisionLedger {
  /**
   * Record an audit event
   */
  static async record(
    eventType: AuditEventType,
    actorType: ActorType,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>,
    actorId?: string
  ): Promise<void> {
    await prisma.auditEvent.create({
      data: {
        eventType,
        actorType,
        actorId,
        entityType,
        entityId,
        metadata,
      },
    })
  }

  /**
   * Get complete transaction timeline
   */
  static async getTransactionTimeline(orderId: string): Promise<any[]> {
    const events = await prisma.auditEvent.findMany({
      where: {
        OR: [
          { entityType: 'ORDER', entityId: orderId },
          {
            entityType: 'CART',
            // Find cart events related to this order
          },
          {
            entityType: 'PAYMENT',
          },
        ],
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    return events
  }

  /**
   * Get agent action history
   */
  static async getAgentHistory(
    agentId: string,
    limit: number = 50
  ): Promise<any[]> {
    const events = await prisma.auditEvent.findMany({
      where: {
        actorType: 'AGENT',
        actorId: agentId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    return events
  }

  /**
   * Get policy decision history
   */
  static async getPolicyDecisions(
    merchantId: string,
    limit: number = 50
  ): Promise<any[]> {
    const events = await prisma.auditEvent.findMany({
      where: {
        eventType: 'POLICY_CHECK',
        entityType: 'MERCHANT',
        entityId: merchantId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    return events
  }

  /**
   * Get approval timeline
   */
  static async getApprovalTimeline(approvalId: string): Promise<any[]> {
    const events = await prisma.auditEvent.findMany({
      where: {
        entityType: 'APPROVAL',
        entityId: approvalId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    return events
  }

  /**
   * Record agent action with decision reasoning
   */
  static async recordAgentAction(
    sessionId: string,
    agentId: string,
    actionType: string,
    toolName: string,
    input: any,
    output: any,
    reason?: string
  ): Promise<string> {
    const action = await prisma.agentAction.create({
      data: {
        sessionId,
        agentId,
        actionType,
        toolName,
        input,
        output,
        status: 'COMPLETED',
        reason,
      },
    })

    // Also create audit event
    await this.record(
      'AGENT_ACTION',
      'AGENT',
      'AGENT_ACTION',
      action.id,
      { actionType, toolName, reason },
      agentId
    )

    return action.id
  }

  /**
   * Get complete decision trace for a checkout
   */
  static async getCheckoutDecisionTrace(checkoutId: string): Promise<{
    userIntent: string
    agentActions: any[]
    policyChecks: any[]
    approval: any
    payment: any
    result: any
  }> {
    // Get checkout details
    const checkout = await prisma.checkout.findUnique({
      where: { id: checkoutId },
      include: {
        cart: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            order: true,
          },
        },
        payment: {
          include: {
            attempts: true,
          },
        },
        approval: true,
      },
    })

    if (!checkout) {
      throw new Error('Checkout not found')
    }

    // Get related audit events
    const events = await prisma.auditEvent.findMany({
      where: {
        OR: [
          { entityType: 'CHECKOUT', entityId: checkoutId },
          { entityType: 'CART', entityId: checkout.cartId },
          { entityType: 'PAYMENT', entityId: checkout.payment?.id },
          { entityType: 'APPROVAL', entityId: checkout.approval?.id },
        ],
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Get agent actions
    const agentActions = await prisma.agentAction.findMany({
      where: {
        output: {
          path: ['checkoutId'],
          equals: checkoutId,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return {
      userIntent: 'Purchase request',
      agentActions: agentActions.map(a => ({
        action: a.actionType,
        tool: a.toolName,
        reason: a.reason,
        timestamp: a.createdAt,
      })),
      policyChecks: events
        .filter(e => e.eventType === 'POLICY_CHECK')
        .map(e => ({
          decision: e.metadata,
          timestamp: e.timestamp,
        })),
      approval: checkout.approval
        ? {
            status: checkout.approval.status,
            approvedBy: checkout.approval.approvedBy,
            approvedAt: checkout.approval.approvedAt,
            reason: checkout.approval.reason,
          }
        : null,
      payment: checkout.payment
        ? {
            status: checkout.payment.status,
            attempts: checkout.payment.attempts.length,
            amount: checkout.payment.amount,
          }
        : null,
      result: checkout.cart.order
        ? {
            orderId: checkout.cart.order.id,
            status: checkout.cart.order.status,
          }
        : null,
    }
  }

  /**
   * Generate explainable recommendation trace
   */
  static async explainRecommendation(recommendationId: string): Promise<{
    product: any
    reason: string
    factors: string[]
  }> {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        product: true,
      },
    })

    if (!recommendation) {
      throw new Error('Recommendation not found')
    }

    // Parse factors from reason and metadata
    const factors: string[] = []

    if (recommendation.score > 0.8) {
      factors.push('High relevance score')
    }

    if (recommendation.product.inventory > 0) {
      factors.push('In stock')
    }

    if (recommendation.type === 'UPSELL') {
      factors.push('Higher value alternative')
    } else if (recommendation.type === 'CROSS_SELL') {
      factors.push('Frequently purchased together')
    }

    return {
      product: recommendation.product,
      reason: recommendation.reason || 'Recommended based on your requirements',
      factors,
    }
  }
}
