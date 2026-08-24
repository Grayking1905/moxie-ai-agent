'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, ShoppingCart, DollarSign, TrendingUp, Activity, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type Stats = {
  revenue: number
  orders: number
  avgOrderValue: number
  aiAssistedRevenue: number
}

type Product = {
  id: string
  name: string
  price: number
  inventory: number
  category: string
}

type Order = {
  id: string
  orderNumber: string
  total: number
  status: string
  createdAt: string
}

export default function MerchantPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsRes, productsRes, ordersRes] = await Promise.all([
        fetch('/api/merchant/analytics'),
        fetch('/api/merchant/products'),
        fetch('/api/merchant/orders'),
      ])

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }

      if (productsRes.ok) {
        setProducts(await productsRes.json())
      }

      if (ordersRes.ok) {
        setOrders(await ordersRes.json())
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Moxie Tech Store</h1>
              <p className="text-sm text-gray-600">Merchant Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/buyer"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Store
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Revenue</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.revenue) : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total revenue</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Orders</span>
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats ? stats.orders : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total orders</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg Order Value</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.avgOrderValue) : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Average per order</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">AI-Assisted</span>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.aiAssistedRevenue) : '—'}
            </div>
            <p className="text-xs text-gray-500 mt-1">AI-driven revenue</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Products */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Products</h2>
              </div>
              <span className="text-sm text-gray-600">{products.length} items</span>
            </div>
            <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No products found
                </div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {product.category}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(product.price)}
                        </div>
                        <div className={`text-xs mt-1 ${
                          product.inventory > 10 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {product.inventory} in stock
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Orders */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              </div>
              <span className="text-sm text-gray-600">{orders.length} orders</span>
            </div>
            <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No orders yet
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.total)}
                        </div>
                        <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${
                          order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AI Commerce Status */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Commerce Active
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Your store is AI-readable. Agents can discover products, make recommendations,
                and complete transactions — all under safe, bounded control.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-xs text-gray-600 mb-1">Max Transaction</div>
                  <div className="text-sm font-semibold text-gray-900">₹5,000</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-xs text-gray-600 mb-1">Approval Threshold</div>
                  <div className="text-sm font-semibold text-gray-900">₹1,500</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-xs text-gray-600 mb-1">Daily Agent Limit</div>
                  <div className="text-sm font-semibold text-gray-900">₹20,000</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Notice */}
        <div className="mt-6 bg-yellow-50 rounded-lg border border-yellow-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-900 mb-1">
              Demo Mode
            </h4>
            <p className="text-xs text-yellow-800">
              This is a demo merchant running in test mode. All payments are processed through Razorpay Test Mode.
              No real money is charged.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
