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

    const orders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
