import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: 'Moxie Tech Store',
      slug: 'moxie-tech-store',
      currency: 'INR',
      status: 'ACTIVE',
    },
  })

  console.log('✓ Created merchant:', merchant.name)

  // Create merchant policy
  const policy = await prisma.merchantPolicy.create({
    data: {
      merchantId: merchant.id,
      maxTransactionAmount: 500000, // ₹5,000
      dailyTransactionLimit: 2000000, // ₹20,000
      approvalThreshold: 150000, // ₹1,500
      maxDiscountPercent: 15,
      allowBundleDiscount: true,
      allowFreeShipping: true,
      minimumMarginPercent: 20,
      allowedCurrencies: ['INR'],
    },
  })

  console.log('✓ Created merchant policy')

  // Create buyer agent
  const buyerAgent = await prisma.agent.create({
    data: {
      merchantId: merchant.id,
      type: 'BUYER_AGENT',
      name: 'Moxie Buyer Agent',
      status: 'ACTIVE',
      trustScore: 95,
    },
  })

  console.log('✓ Created buyer agent')

  // Create agent permissions
  const permissions = [
    'catalog.read',
    'catalog.search',
    'cart.create',
    'cart.read',
    'cart.update',
    'checkout.create',
    'payment.create',
    'order.read',
  ]

  for (const permission of permissions) {
    await prisma.agentPermission.create({
      data: {
        agentId: buyerAgent.id,
        permission,
        allowed: true,
      },
    })
  }

  console.log('✓ Created agent permissions')

  // Create agent budget
  await prisma.agentBudget.create({
    data: {
      agentId: buyerAgent.id,
      dailyLimit: 2000000, // ₹20,000
      dailySpent: 0,
    },
  })

  console.log('✓ Created agent budget')

  // Create demo products
  const products = [
    {
      name: 'TravelPro Backpack',
      description: 'Waterproof laptop backpack with 25L capacity, supports 15.6" laptops',
      price: 249900, // ₹2,499
      costPrice: 180000, // ₹1,800
      category: 'Backpacks',
      inventory: 42,
      images: ['/products/backpack-1.jpg'],
    },
    {
      name: 'Laptop Sleeve 15.6"',
      description: 'Padded laptop sleeve with water-resistant exterior',
      price: 79900, // ₹799
      costPrice: 50000, // ₹500
      category: 'Accessories',
      inventory: 120,
      images: ['/products/sleeve-1.jpg'],
    },
    {
      name: 'Wireless Mouse Pro',
      description: 'Ergonomic wireless mouse with precision tracking',
      price: 129900, // ₹1,299
      costPrice: 80000, // ₹800
      category: 'Accessories',
      inventory: 85,
      images: ['/products/mouse-1.jpg'],
    },
    {
      name: 'Mechanical Keyboard RGB',
      description: 'Premium mechanical keyboard with RGB lighting',
      price: 499900, // ₹4,999
      costPrice: 350000, // ₹3,500
      category: 'Accessories',
      inventory: 32,
      images: ['/products/keyboard-1.jpg'],
    },
    {
      name: 'Noise Cancelling Headphones',
      description: 'Premium headphones with active noise cancellation',
      price: 349900, // ₹3,499
      costPrice: 250000, // ₹2,500
      category: 'Audio',
      inventory: 58,
      images: ['/products/headphones-1.jpg'],
    },
    {
      name: 'HD Webcam Pro',
      description: '1080p webcam with auto-focus and noise reduction',
      price: 299900, // ₹2,999
      costPrice: 200000, // ₹2,000
      category: 'Accessories',
      inventory: 45,
      images: ['/products/webcam-1.jpg'],
    },
    {
      name: 'USB-C Hub 7-in-1',
      description: '7-port USB-C hub with HDMI, USB 3.0, and card reader',
      price: 249900, // ₹2,499
      costPrice: 150000, // ₹1,500
      category: 'Accessories',
      inventory: 67,
      images: ['/products/hub-1.jpg'],
    },
    {
      name: 'Adjustable Laptop Stand',
      description: 'Ergonomic aluminum laptop stand with cooling',
      price: 199900, // ₹1,999
      costPrice: 120000, // ₹1,200
      category: 'Accessories',
      inventory: 93,
      images: ['/products/stand-1.jpg'],
    },
    {
      name: 'Rain Cover for Backpack',
      description: 'Universal rain cover for backpacks up to 30L',
      price: 39900, // ₹399
      costPrice: 20000, // ₹200
      category: 'Accessories',
      inventory: 150,
      images: ['/products/rain-cover-1.jpg'],
    },
    {
      name: 'Portable Power Bank 20000mAh',
      description: 'Fast-charging power bank with dual USB ports',
      price: 199900, // ₹1,999
      costPrice: 130000, // ₹1,300
      category: 'Accessories',
      inventory: 78,
      images: ['/products/powerbank-1.jpg'],
    },
  ]

  const createdProducts = []
  for (const productData of products) {
    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        ...productData,
        status: 'ACTIVE',
      },
    })
    createdProducts.push(product)
    console.log(`✓ Created product: ${product.name}`)
  }

  // Create product relationships (upsell, cross-sell)
  const relationships = [
    // Backpack relationships
    {
      from: 'TravelPro Backpack',
      to: 'Rain Cover for Backpack',
      type: 'CROSS_SELL',
      score: 0.95,
    },
    {
      from: 'TravelPro Backpack',
      to: 'Laptop Sleeve 15.6"',
      type: 'CROSS_SELL',
      score: 0.88,
    },
    {
      from: 'TravelPro Backpack',
      to: 'Portable Power Bank 20000mAh',
      type: 'CROSS_SELL',
      score: 0.82,
    },
    // Mouse relationships
    {
      from: 'Wireless Mouse Pro',
      to: 'Mechanical Keyboard RGB',
      type: 'BUNDLE',
      score: 0.90,
    },
    {
      from: 'Wireless Mouse Pro',
      to: 'Adjustable Laptop Stand',
      type: 'CROSS_SELL',
      score: 0.75,
    },
    // Laptop accessories
    {
      from: 'Laptop Sleeve 15.6"',
      to: 'USB-C Hub 7-in-1',
      type: 'CROSS_SELL',
      score: 0.85,
    },
    {
      from: 'USB-C Hub 7-in-1',
      to: 'Adjustable Laptop Stand',
      type: 'CROSS_SELL',
      score: 0.80,
    },
    // Webcam relationships
    {
      from: 'HD Webcam Pro',
      to: 'Noise Cancelling Headphones',
      type: 'BUNDLE',
      score: 0.92,
    },
  ]

  for (const rel of relationships) {
    const fromProduct = createdProducts.find(p => p.name === rel.from)
    const toProduct = createdProducts.find(p => p.name === rel.to)

    if (fromProduct && toProduct) {
      await prisma.productRelationship.create({
        data: {
          fromProductId: fromProduct.id,
          toProductId: toProduct.id,
          type: rel.type,
          score: rel.score,
        },
      })
    }
  }

  console.log('✓ Created product relationships')

  // Create a demo customer
  const customer = await prisma.customer.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo Customer',
    },
  })

  console.log('✓ Created demo customer')

  console.log('\n🎉 Database seeded successfully!')
  console.log('\nDemo Credentials:')
  console.log('Merchant:', merchant.name)
  console.log('Merchant ID:', merchant.id)
  console.log('Agent ID:', buyerAgent.id)
  console.log('Customer Email:', customer.email)
  console.log('\nYou can now start the development server with: npm run dev')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
