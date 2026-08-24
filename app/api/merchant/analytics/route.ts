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

    // Calculate stats
    const orders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id,
        status: 'CONFIRMED',
      },
    })

    const revenue = orders.reduce((sum, order) => sum + order.total, 0)
    const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0

    // For demo, assume 30% is AI-assisted
    const aiAssistedRevenue = Math.floor(revenue * 0.3)

    return NextResponse.json({
      revenue,
      orders: orders.length,
      avgOrderValue,
      aiAssistedRevenue,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
