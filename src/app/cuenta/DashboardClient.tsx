"use client";

import Link from "next/link";
import { User, ShoppingBag, CreditCard, MapPin } from "lucide-react";
import AccountInfoBanner from "@/components/account/AccountInfoBanner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type DashboardClientProps = {
  user: SupabaseUser;
  searchParams: { verified?: string; error?: string };
};

export default function DashboardClient({
  user,
  searchParams,
}: DashboardClientProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Mi Cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestión de cuenta y configuración personal
        </p>
      </header>

      <AccountInfoBanner showVerified={searchParams.verified === "1"} />

      {searchParams.error && (
        <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <p className="text-sm text-red-800">
            {searchParams.error === "auth"
              ? "Hubo un problema con la autenticación. Intenta de nuevo."
              : "Ocurrió un error. Intenta de nuevo."}
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta 1: Perfil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Perfil</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 flex-1">
            Actualiza tu información personal y preferencias
          </p>
          <Link
            href="/cuenta/perfil"
            className="inline-flex items-center justify-center rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Ir a perfil
          </Link>
        </div>

        {/* Tarjeta 2: Pedidos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Pedidos</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 flex-1">
            Revisa el historial de tus compras
          </p>
          <Link
            href="/cuenta/pedidos"
            className="inline-flex items-center justify-center rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Ver pedidos
          </Link>
        </div>

        {/* Tarjeta 3: Métodos de Pago */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Métodos de Pago
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 flex-1">
            Gestiona tus formas de pago guardadas
          </p>
          <div className="inline-flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 px-4 py-2 text-sm font-medium cursor-not-allowed">
            Próximamente disponible
          </div>
        </div>

        {/* Tarjeta 4: Direcciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Direcciones</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 flex-1">
            Administra tus direcciones de envío
          </p>
          <Link
            href="/cuenta/direcciones"
            className="inline-flex items-center justify-center rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Ver direcciones
          </Link>
        </div>
      </div>
    </div>
  );
}

