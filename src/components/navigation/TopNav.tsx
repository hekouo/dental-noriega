'use client'

import Link from 'next/link'
import { ShoppingCart, User, Menu, X } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

export function TopNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const itemCount = useCartStore((state) => state.getItemCount())
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="font-bold text-xl text-primary-600">
            <span>Depósito Dental</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href={ROUTES.destacados()} className="text-gray-700 hover:text-primary-600">
              <span>Destacados</span>
            </Link>
            <Link href={ROUTES.catalogIndex()} className="text-gray-700 hover:text-primary-600">
              <span>Catálogo</span>
            </Link>
            <Link href={ROUTES.carrito()} className="relative text-gray-700 hover:text-primary-600">
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600">
                  <User size={24} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block">
                  <Link
                    href="/cuenta/perfil"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <span>Mi Perfil</span>
                  </Link>
                  <Link
                    href="/cuenta/pedidos"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <span>Mis Pedidos</span>
                  </Link>
                  <Link
                    href="/cuenta/puntos"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <span>Mis Puntos</span>
                  </Link>
                  <Link
                    href="/cuenta/direcciones"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <span>Direcciones</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            ) : (
              <Link href={ROUTES.cuenta()} className="btn btn-primary">
                <span>Iniciar Sesión</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-700"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-3 space-y-3">
            <Link
              href={ROUTES.destacados()}
              className="block text-gray-700 hover:text-primary-600"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Destacados</span>
            </Link>
            <Link
              href={ROUTES.catalogIndex()}
              className="block text-gray-700 hover:text-primary-600"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Catálogo</span>
            </Link>
            <Link
              href={ROUTES.carrito()}
              className="block text-gray-700 hover:text-primary-600"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Carrito ({itemCount})</span>
            </Link>
            {user ? (
              <>
                <Link
                  href="/cuenta/perfil"
                  className="block text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>Mi Perfil</span>
                </Link>
                <Link
                  href="/cuenta/pedidos"
                  className="block text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>Mis Pedidos</span>
                </Link>
                <Link
                  href="/cuenta/puntos"
                  className="block text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>Mis Puntos</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left text-gray-700 hover:text-primary-600"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <Link
                href={ROUTES.cuenta()}
                className="block text-primary-600 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

