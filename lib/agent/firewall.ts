import { prisma } from '../db'

export type PolicyDecision = {
  decision: 'ALLOW' | 'DENY'
  reason: string
  requiresApproval: boolean
  violations?: string[]
}

export type AgentPermission =
  | 'catalog.read'
  | 'catalog.search'
  | 'cart.create'
  | 'cart.read'
  | 'cart.update'
  | 'checkout.create'
  | 'payment.create'
  | 'order.read'
  | 'refund.create'
  | 'campaign.create'
  | 'campaign.execute'

export class AgentFirewall {
  /**
   * Check if an agent has permission to perform an action
   */
  static async checkPermission(
    agentId: string,
    permission: AgentPermission
  ): Promise<boolean> {
    const agentPermission = await prisma.agentPermission.findUnique({
      where: {
        agentId_permission: {
          agentId,
          permission,
        },
      },
    })

    return agentPermission?.allowed ?? false
  }

  /**
   * Validate a transaction against merchant policy
   */
  static async validateTransaction(
    merchantId: string,
    amount: number,
    agentId?: string
  ): Promise<PolicyDecision> {
    const policy = await prisma.merchantPolicy.findUnique({
      where: { merchantId },
    })

    if (!policy) {
      return {
        decision: 'DENY',
        reason: 'No merchant policy configured',
        requiresApproval: false,
      }
    }

    const violations: string[] = []

    // Check maximum transaction amount
    if (amount > policy.maxTransactionAmount) {
      violations.push(
        `Transaction amount ₹${amount / 100} exceeds maximum allowed ₹${policy.maxTransactionAmount / 100}`
      )
    }

    // Check agent daily budget if agentId provided
    if (agentId) {
      const budget = await prisma.agentBudget.findUnique({
        where: { agentId },
      })

      if (budget) {
        // Reset daily budget if needed
        const now = new Date()
        const lastReset = new Date(budget.lastResetAt)
        if (now.getDate() !== lastReset.getDate()) {
          await prisma.agentBudget.update({
            where: { agentId },
            data: {
              dailySpent: 0,
              lastResetAt: now,
            },
          })
          budget.dailySpent = 0
        }

        const projectedSpent = budget.dailySpent + amount
        if (projectedSpent > budget.dailyLimit) {
          violations.push(
            `Transaction would exceed agent daily limit. Spent: ₹${budget.dailySpent / 100}, Limit: ₹${budget.dailyLimit / 100}`
          )
        }
      }
    }

    // If there are violations, deny
    if (violations.length > 0) {
      return {
        decision: 'DENY',
        reason: violations.join('. '),
        requiresApproval: false,
        violations,
      }
    }

    // Check if approval is required
    const requiresApproval = amount >= policy.approvalThreshold

    return {
      decision: 'ALLOW',
      reason: requiresApproval
        ? 'Transaction approved but requires human approval due to amount threshold'
        : 'Transaction is within configured agent limits',
      requiresApproval,
    }
  }

  /**
   * Validate a discount against merchant policy
   */
  static async validateDiscount(
    merchantId: string,
    originalAmount: number,
    discountedAmount: number
  ): Promise<PolicyDecision> {
    const policy = await prisma.merchantPolicy.findUnique({
      where: { merchantId },
    })

    if (!policy) {
      return {
        decision: 'DENY',
        reason: 'No merchant policy configured',
        requiresApproval: false,
      }
    }

    const discountPercent = ((originalAmount - discountedAmount) / originalAmount) * 100

    if (discountPercent > policy.maxDiscountPercent) {
      return {
        decision: 'DENY',
        reason: `Discount of ${discountPercent.toFixed(1)}% exceeds maximum allowed ${policy.maxDiscountPercent}%`,
        requiresApproval: false,
        violations: [`Excessive discount: ${discountPercent.toFixed(1)}%`],
      }
    }

    return {
      decision: 'ALLOW',
      reason: 'Discount is within policy limits',
      requiresApproval: discountPercent >= policy.maxDiscountPercent * 0.8, // Require approval at 80% of max
    }
  }

  /**
   * Validate product margin for campaign
   */
  static async validateProductMargin(
    merchantId: string,
    productId: string,
    proposedPrice: number
  ): Promise<PolicyDecision> {
    const policy = await prisma.merchantPolicy.findUnique({
      where: { merchantId },
    })

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!policy || !product || !product.costPrice) {
      return {
        decision: 'DENY',
        reason: 'Unable to validate margin - missing policy or cost data',
        requiresApproval: false,
      }
    }

    const margin = ((proposedPrice - product.costPrice) / proposedPrice) * 100

    if (margin < policy.minimumMarginPercent) {
      return {
        decision: 'DENY',
        reason: `Proposed price results in ${margin.toFixed(1)}% margin, below minimum ${policy.minimumMarginPercent}%`,
        requiresApproval: false,
        violations: [`Insufficient margin: ${margin.toFixed(1)}%`],
      }
    }

    return {
      decision: 'ALLOW',
      reason: 'Product margin meets policy requirements',
      requiresApproval: false,
    }
  }

  /**
   * Record agent spending
   */
  static async recordSpending(agentId: string, amount: number): Promise<void> {
    await prisma.agentBudget.update({
      where: { agentId },
      data: {
        dailySpent: {
          increment: amount,
        },
      },
    })
  }

  /**
   * Create approval request
   */
  static async createApproval(
    type: string,
    amount: number,
    metadata: {
      checkoutId?: string
      campaignId?: string
      actionId?: string
      reason?: string
    }
  ): Promise<string> {
    const approval = await prisma.approval.create({
      data: {
        type,
        amount,
        status: 'PENDING',
        reason: metadata.reason,
        checkoutId: metadata.checkoutId,
        campaignId: metadata.campaignId,
        actionId: metadata.actionId,
      },
    })

    return approval.id
  }

  /**
   * Check approval status
   */
  static async checkApproval(approvalId: string): Promise<{
    status: string
    approvedBy?: string | null
    approvedAt?: Date | null
  }> {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
    })

    if (!approval) {
      throw new Error('Approval not found')
    }

    return {
      status: approval.status,
      approvedBy: approval.approvedBy,
      approvedAt: approval.approvedAt,
    }
  }

  /**
   * Approve or reject an approval request
   */
  static async processApproval(
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED',
    approvedBy: string
  ): Promise<void> {
    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: decision,
        approvedBy,
        approvedAt: new Date(),
      },
    })
  }
}
