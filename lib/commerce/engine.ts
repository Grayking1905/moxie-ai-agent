import { prisma } from '../db'
import { generateOrderNumber } from '../utils'
import { DecisionLedger } from '../audit/ledger'

export class CommerceEngine {
  /**
   * Search products with filters
   */
  static async searchProducts(
    merchantId: string,
    query?: string,
    filters?: {
      category?: string
      minPrice?: number
      maxPrice?: number
      inStock?: boolean
    }
  ) {
    const where: any = {
      merchantId,
      status: 'ACTIVE',
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ]
    }

    if (filters?.category) {
      where.category = filters.category
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {}
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice
      }
    }

    if (filters?.inStock) {
      where.inventory = { gt: 0 }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        relationships: {
          include: {
            toProduct: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return products
  }

  /**
   * Get product recommendations (upsell/cross-sell)
   */
  static async getRecommendations(
    productId: string,
    type: 'UPSELL' | 'CROSS_SELL' | 'BUNDLE'
  ) {
    const relationships = await prisma.productRelationship.findMany({
      where: {
        fromProductId: productId,
        type,
      },
      include: {
        toProduct: true,
      },
      orderBy: {
        score: 'desc',
      },
      take: 5,
    })

    return relationships.map(r => ({
      product: r.toProduct,
      score: r.score,
      type: r.type,
    }))
  }

  /**
   * Create or get cart
   */
  static async createCart(merchantId: string, customerId?: string, sessionId?: string) {
    const cart = await prisma.cart.create({
      data: {
        merchantId,
        customerId,
        sessionId,
        status: 'ACTIVE',
      },
    })

    await DecisionLedger.record(
      'CART_CREATED',
      customerId ? 'USER' : 'AGENT',
      'CART',
      cart.id,
      { merchantId, customerId, sessionId }
    )

    return cart
  }

  /**
   * Add item to cart
   */
  static async addToCart(cartId: string, productId: string, quantity: number = 1) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      throw new Error('Product not found')
    }

    if (product.inventory < quantity) {
      throw new Error('Insufficient inventory')
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
      },
    })

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      })
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity,
          price: product.price,
        },
      })
    }

    // Recalculate cart totals
    await this.recalculateCart(cartId)

    await DecisionLedger.record(
      'CART_UPDATED',
      'AGENT',
      'CART',
      cartId,
      { action: 'ADD_ITEM', productId, quantity }
    )

    return this.getCart(cartId)
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(cartId: string, itemId: string) {
    await prisma.cartItem.delete({
      where: { id: itemId },
    })

    await this.recalculateCart(cartId)

    await DecisionLedger.record(
      'CART_UPDATED',
      'AGENT',
      'CART',
      cartId,
      { action: 'REMOVE_ITEM', itemId }
    )

    return this.getCart(cartId)
  }

  /**
   * Recalculate cart totals
   */
  static async recalculateCart(cartId: string) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: true,
      },
    })

    if (!cart) {
      throw new Error('Cart not found')
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    // Calculate shipping (simplified - could be based on weight, location, etc.)
    const shipping = subtotal > 50000 ? 0 : 5000 // Free shipping over ₹500

    const total = subtotal - cart.discount + shipping

    await prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        shipping,
        total,
      },
    })
  }

  /**
   * Get cart with items
   */
  static async getCart(cartId: string) {
    return prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })
  }

  /**
   * Create checkout
   */
  static async createCheckout(cartId: string) {
    const cart = await this.getCart(cartId)

    if (!cart) {
      throw new Error('Cart not found')
    }

    if (cart.items.length === 0) {
      throw new Error('Cart is empty')
    }

    // Verify inventory
    for (const item of cart.items) {
      if (item.product.inventory < item.quantity) {
        throw new Error(`Insufficient inventory for ${item.product.name}`)
      }
    }

    const checkout = await prisma.checkout.create({
      data: {
        cartId,
        total: cart.total,
        currency: cart.currency,
        status: 'PENDING',
      },
    })

    await DecisionLedger.record(
      'CHECKOUT_CREATED',
      'AGENT',
      'CHECKOUT',
      checkout.id,
      { cartId, total: cart.total }
    )

    return checkout
  }

  /**
   * Create order from checkout
   */
  static async createOrder(checkoutId: string) {
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
          },
        },
      },
    })

    if (!checkout) {
      throw new Error('Checkout not found')
    }

    if (checkout.status !== 'APPROVED') {
      throw new Error('Checkout must be approved before creating order')
    }

    const cart = checkout.cart

    // Create order
    const order = await prisma.order.create({
      data: {
        merchantId: cart.merchantId,
        customerId: cart.customerId,
        cartId: cart.id,
        orderNumber: generateOrderNumber(),
        status: 'PENDING',
        subtotal: cart.subtotal,
        discount: cart.discount,
        shipping: cart.shipping,
        total: cart.total,
        currency: cart.currency,
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // Update cart status
    await prisma.cart.update({
      where: { id: cart.id },
      data: { status: 'CONVERTED' },
    })

    // Update checkout status
    await prisma.checkout.update({
      where: { id: checkoutId },
      data: { status: 'COMPLETED' },
    })

    // Decrement inventory
    for (const item of cart.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          inventory: {
            decrement: item.quantity,
          },
        },
      })
    }

    await DecisionLedger.record(
      'ORDER_CREATED',
      'SYSTEM',
      'ORDER',
      order.id,
      { checkoutId, orderNumber: order.orderNumber, total: order.total }
    )

    return order
  }

  /**
   * Confirm order after successful payment
   */
  static async confirmOrder(orderId: string) {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
      },
    })

    await DecisionLedger.record(
      'ORDER_CREATED',
      'SYSTEM',
      'ORDER',
      orderId,
      { status: 'CONFIRMED' }
    )

    return order
  }

  /**
   * Get merchant's AI Commerce Passport
   */
  static async getCommercePassport(merchantId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        policy: true,
      },
    })

    if (!merchant) {
      throw new Error('Merchant not found')
    }

    return {
      merchant: merchant.name,
      currency: merchant.currency,
      capabilities: [
        'catalog.search',
        'catalog.read',
        'cart.create',
        'cart.update',
        'checkout.create',
        'payment.create',
        'order.read',
      ],
      limits: merchant.policy
        ? {
            maxTransaction: merchant.policy.maxTransactionAmount,
            approvalThreshold: merchant.policy.approvalThreshold,
            maxDiscount: merchant.policy.maxDiscountPercent,
          }
        : null,
      approval: {
        required: merchant.policy ? merchant.policy.approvalThreshold > 0 : true,
      },
    }
  }
}
