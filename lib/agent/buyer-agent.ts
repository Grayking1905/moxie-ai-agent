import { z } from 'zod'
import { CommerceEngine } from '../commerce/engine'
import { AgentFirewall } from './firewall'
import { DecisionLedger } from '../audit/ledger'
import { prisma } from '../db'

// Tool schemas
export const searchProductsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional().default(true),
})

export const addToCartSchema = z.object({
  cartId: z.string(),
  productId: z.string(),
  quantity: z.number().min(1).default(1),
})

export const getRecommendationsSchema = z.object({
  productId: z.string(),
  type: z.enum(['UPSELL', 'CROSS_SELL', 'BUNDLE']),
})

export const createCheckoutSchema = z.object({
  cartId: z.string(),
})

export const requestPaymentSchema = z.object({
  checkoutId: z.string(),
})

// Tool definitions for AI
export const buyerAgentTools = [
  {
    name: 'search_products',
    description: 'Search for products in the merchant catalog. Use this when the user asks for products matching certain criteria.',
    parameters: searchProductsSchema,
  },
  {
    name: 'get_product',
    description: 'Get detailed information about a specific product',
    parameters: z.object({
      productId: z.string(),
    }),
  },
  {
    name: 'check_inventory',
    description: 'Check if a product is in stock',
    parameters: z.object({
      productId: z.string(),
    }),
  },
  {
    name: 'create_cart',
    description: 'Create a new shopping cart for the customer',
    parameters: z.object({
      merchantId: z.string(),
      customerId: z.string().optional(),
    }),
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to the shopping cart',
    parameters: addToCartSchema,
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the shopping cart',
    parameters: z.object({
      cartId: z.string(),
      itemId: z.string(),
    }),
  },
  {
    name: 'get_cart',
    description: 'Get the current cart contents and totals',
    parameters: z.object({
      cartId: z.string(),
    }),
  },
  {
    name: 'recommend_product',
    description: 'Get AI-powered product recommendations based on context',
    parameters: z.object({
      productId: z.string(),
      type: z.enum(['UPSELL', 'CROSS_SELL', 'BUNDLE']),
    }),
  },
  {
    name: 'create_checkout',
    description: 'Create a checkout from the cart. This requires policy validation.',
    parameters: createCheckoutSchema,
  },
  {
    name: 'request_payment',
    description: 'Request payment for a checkout. This requires approval and goes through the Agent Firewall.',
    parameters: requestPaymentSchema,
  },
]

export class BuyerAgent {
  private merchantId: string
  private agentId: string
  private sessionId: string

  constructor(merchantId: string, agentId: string, sessionId: string) {
    this.merchantId = merchantId
    this.agentId = agentId
    this.sessionId = sessionId
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, parameters: any): Promise<any> {
    // Check permission
    const hasPermission = await AgentFirewall.checkPermission(
      this.agentId,
      this.mapToolToPermission(toolName)
    )

    if (!hasPermission) {
      throw new Error(`Agent does not have permission to ${toolName}`)
    }

    // Execute tool
    let result
    switch (toolName) {
      case 'search_products':
        result = await this.searchProducts(parameters)
        break
      case 'get_product':
        result = await this.getProduct(parameters.productId)
        break
      case 'check_inventory':
        result = await this.checkInventory(parameters.productId)
        break
      case 'create_cart':
        result = await this.createCart(parameters)
        break
      case 'add_to_cart':
        result = await this.addToCart(parameters)
        break
      case 'remove_from_cart':
        result = await this.removeFromCart(parameters)
        break
      case 'get_cart':
        result = await this.getCart(parameters.cartId)
        break
      case 'recommend_product':
        result = await this.recommendProduct(parameters)
        break
      case 'create_checkout':
        result = await this.createCheckout(parameters)
        break
      case 'request_payment':
        result = await this.requestPayment(parameters)
        break
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }

    // Record action
    await DecisionLedger.recordAgentAction(
      this.sessionId,
      this.agentId,
      toolName,
      toolName,
      parameters,
      result,
      typeof result === 'object' && result && 'reason' in result
        ? String(result.reason)
        : undefined
    )

    return result
  }

  private mapToolToPermission(toolName: string): any {
    const map: Record<string, string> = {
      search_products: 'catalog.search',
      get_product: 'catalog.read',
      check_inventory: 'catalog.read',
      create_cart: 'cart.create',
      add_to_cart: 'cart.update',
      remove_from_cart: 'cart.update',
      get_cart: 'cart.read',
      recommend_product: 'catalog.read',
      create_checkout: 'checkout.create',
      request_payment: 'payment.create',
    }
    return map[toolName] || 'catalog.read'
  }

  private async searchProducts(params: z.infer<typeof searchProductsSchema>) {
    const products = await CommerceEngine.searchProducts(this.merchantId, params.query, {
      category: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      inStock: params.inStock,
    })

    return {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        category: p.category,
        inventory: p.inventory,
        inStock: p.inventory > 0,
      })),
      count: products.length,
    }
  }

  private async getProduct(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        relationships: {
          include: {
            toProduct: true,
          },
        },
      },
    })

    if (!product) {
      throw new Error('Product not found')
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      category: product.category,
      inventory: product.inventory,
      inStock: product.inventory > 0,
      images: product.images,
      relatedProducts: product.relationships.map(r => r.toProduct.id),
    }
  }

  private async checkInventory(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, inventory: true },
    })

    if (!product) {
      throw new Error('Product not found')
    }

    return {
      productId: product.id,
      productName: product.name,
      inventory: product.inventory,
      inStock: product.inventory > 0,
    }
  }

  private async createCart(params: { merchantId?: string; customerId?: string }) {
    const cart = await CommerceEngine.createCart(
      params.merchantId || this.merchantId,
      params.customerId,
      this.sessionId
    )

    return {
      cartId: cart.id,
      status: cart.status,
      total: cart.total,
      currency: cart.currency,
      reason: 'Cart created successfully',
    }
  }

  private async addToCart(params: z.infer<typeof addToCartSchema>) {
    const cart = await CommerceEngine.addToCart(
      params.cartId,
      params.productId,
      params.quantity
    )

    return {
      cartId: cart!.id,
      itemsCount: cart!.items.length,
      subtotal: cart!.subtotal,
      total: cart!.total,
      currency: cart!.currency,
      reason: 'Product added to cart',
    }
  }

  private async removeFromCart(params: { cartId: string; itemId: string }) {
    const cart = await CommerceEngine.removeFromCart(params.cartId, params.itemId)

    return {
      cartId: cart!.id,
      itemsCount: cart!.items.length,
      total: cart!.total,
      reason: 'Item removed from cart',
    }
  }

  private async getCart(cartId: string) {
    const cart = await CommerceEngine.getCart(cartId)

    if (!cart) {
      throw new Error('Cart not found')
    }

    return {
      cartId: cart.id,
      items: cart.items.map(item => ({
        itemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })),
      subtotal: cart.subtotal,
      discount: cart.discount,
      shipping: cart.shipping,
      total: cart.total,
      currency: cart.currency,
    }
  }

  private async recommendProduct(params: z.infer<typeof getRecommendationsSchema>) {
    const recommendations = await CommerceEngine.getRecommendations(
      params.productId,
      params.type
    )

    const product = await prisma.product.findUnique({
      where: { id: params.productId },
    })

    return {
      baseProduct: product?.name,
      type: params.type,
      recommendations: recommendations.map(rec => ({
        productId: rec.product.id,
        name: rec.product.name,
        description: rec.product.description,
        price: rec.product.price,
        currency: rec.product.currency,
        score: rec.score,
        reason: this.getRecommendationReason(params.type, rec.product.name),
      })),
      reason: `Found ${recommendations.length} ${params.type.toLowerCase()} recommendations`,
    }
  }

  private getRecommendationReason(type: string, productName: string): string {
    switch (type) {
      case 'UPSELL':
        return `${productName} offers enhanced features at a higher price point`
      case 'CROSS_SELL':
        return `${productName} is frequently purchased together with your selected item`
      case 'BUNDLE':
        return `${productName} is part of a recommended bundle offering`
      default:
        return `${productName} is recommended for you`
    }
  }

  private async createCheckout(params: z.infer<typeof createCheckoutSchema>) {
    const cart = await CommerceEngine.getCart(params.cartId)

    if (!cart) {
      throw new Error('Cart not found')
    }

    // Validate through Agent Firewall
    const policyDecision = await AgentFirewall.validateTransaction(
      this.merchantId,
      cart.total,
      this.agentId
    )

    if (policyDecision.decision === 'DENY') {
      throw new Error(`Policy check failed: ${policyDecision.reason}`)
    }

    // Create checkout
    const checkout = await CommerceEngine.createCheckout(params.cartId)

    // Record policy decision
    await DecisionLedger.record(
      'POLICY_CHECK',
      'AGENT',
      'CHECKOUT',
      checkout.id,
      {
        decision: policyDecision.decision,
        reason: policyDecision.reason,
        requiresApproval: policyDecision.requiresApproval,
        amount: cart.total,
      },
      this.agentId
    )

    // Create approval if needed
    let approvalId
    if (policyDecision.requiresApproval) {
      approvalId = await AgentFirewall.createApproval('PAYMENT', cart.total, {
        checkoutId: checkout.id,
        reason: policyDecision.reason,
      })

      await DecisionLedger.record(
        'APPROVAL_REQUESTED',
        'AGENT',
        'APPROVAL',
        approvalId,
        {
          checkoutId: checkout.id,
          amount: cart.total,
          reason: policyDecision.reason,
        },
        this.agentId
      )
    }

    return {
      checkoutId: checkout.id,
      total: checkout.total,
      currency: checkout.currency,
      policyDecision: policyDecision.decision,
      requiresApproval: policyDecision.requiresApproval,
      approvalId,
      reason: policyDecision.reason,
    }
  }

  private async requestPayment(params: z.infer<typeof requestPaymentSchema>) {
    const checkout = await prisma.checkout.findUnique({
      where: { id: params.checkoutId },
      include: {
        approval: true,
      },
    })

    if (!checkout) {
      throw new Error('Checkout not found')
    }

    // Check if approval is required and granted
    if (checkout.approval) {
      if (checkout.approval.status === 'PENDING') {
        throw new Error('Waiting for approval')
      }
      if (checkout.approval.status === 'REJECTED') {
        throw new Error('Checkout was rejected')
      }
    }

    // Update checkout status
    await prisma.checkout.update({
      where: { id: params.checkoutId },
      data: { status: 'APPROVED' },
    })

    // Create payment order
    const { PaymentService } = await import('../payment/service')
    const paymentOrder = await PaymentService.createPaymentOrder(params.checkoutId)

    return {
      checkoutId: params.checkoutId,
      paymentId: paymentOrder.paymentId,
      providerOrderId: paymentOrder.providerOrderId,
      provider: paymentOrder.provider,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      razorpayKey: paymentOrder.key,
      reason: 'Payment order created successfully',
    }
  }
}
