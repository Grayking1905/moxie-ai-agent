import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get first merchant (demo)
    const merchant = await prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    })

    if (!merchant) {
      return NextResponse.json({ error: 'No merchant found' }, { status: 404 })
    }

    const products = await prisma.product.findMany({
      where: {
        merchantId: merchant.id,
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        price: true,
        inventory: true,
        category: true,
      },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
