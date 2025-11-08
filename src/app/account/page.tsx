import Link from "next/link";
import { Settings, Package, CreditCard, User } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import buttonStyles from "@/components/ui/button.module.css";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <User size={64} className="text-primary-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Cuenta</h1>
            <p className="text-gray-600">
              Gestión de cuenta y configuración personal
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <Settings className="text-primary-600 mr-3" size={24} />
                <h3 className="text-lg font-semibold">Perfil</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Actualiza tu información personal y preferencias
              </p>
              <div className="text-sm text-gray-500">
                Próximamente disponible
              </div>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <Package className="text-primary-600 mr-3" size={24} />
                <h3 className="text-lg font-semibold">Pedidos</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Revisa el historial de tus compras
              </p>
              <div className="text-sm text-gray-500">
                Próximamente disponible
              </div>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <CreditCard className="text-primary-600 mr-3" size={24} />
                <h3 className="text-lg font-semibold">Métodos de Pago</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Gestiona tus formas de pago guardadas
              </p>
              <div className="text-sm text-gray-500">
                Próximamente disponible
              </div>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <User className="text-primary-600 mr-3" size={24} />
                <h3 className="text-lg font-semibold">Direcciones</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Administra tus direcciones de envío
              </p>
              <div className="text-sm text-gray-500">
                Próximamente disponible
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href={ROUTES.home()}
              className={`${buttonStyles.primary} px-4`}
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
