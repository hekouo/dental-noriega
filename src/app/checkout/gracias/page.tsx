'use client'

import { useEffect, useState, Suspense } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { CheckCircle } from 'lucide-react'
import { formatCurrency, calculatePointsEarned } from '@/lib/utils/currency'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/routes'

function GraciasContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      loadOrder()
    }
    // Clear checkout data
    localStorage.removeItem('checkout_data')
    localStorage.removeItem('checkout_method')
  }, [sessionId])

  const loadOrder = async () => {
    const supabase = createClient()
    
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('stripe_session_id', sessionId)
      .single()

    setOrder(data)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AuthGuard>
    )
  }

  const pointsEarned = order ? calculatePointsEarned(order.total) : 0

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle size={48} className="text-green-600" />
            </div>

            <h1 className="text-3xl font-bold mb-2">¡Pedido Confirmado!</h1>
            <p className="text-gray-600 mb-8">
              Gracias por tu compra. Recibirás un correo con los detalles.
            </p>

            {order && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Número de pedido</p>
                  <p className="font-mono font-semibold">#{order.id.slice(0, 8)}</p>
                </div>

                <div className="space-y-2 mb-4">
                  {order.order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name} x{item.qty}
                      </span>
                      <span>{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total pagado</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {pointsEarned > 0 && (
                  <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                    <p className="text-primary-600 font-medium">
                      🎉 ¡Ganaste {pointsEarned} puntos!
                    </p>
                    <p className="text-sm text-primary-600">
                      Equivalentes a {formatCurrency(calculatePointsEarned(pointsEarned) * 0.1)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cuenta/pedidos" className="btn btn-primary">
                <span>Ver Mis Pedidos</span>
              </Link>
              <Link href={ROUTES.destacados()} className="btn btn-secondary">
                <span>Seguir Comprando</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

export default function GraciasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <GraciasContent />
    </Suspense>
  )
}

