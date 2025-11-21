// src/components/SiteFooter.tsx
import Link from "next/link";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-gray-600">
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">{SITE.name}</h3>
          <p>
            Insumos y equipos dentales. Servicio a clínicas, consultorios y
            mayoristas.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">Navegación</h3>
          <ul className="space-y-1">
            <li>
              <Link
                href="/tienda"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Tienda
              </Link>
            </li>
            <li>
              <Link
                href="/destacados"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Productos destacados
              </Link>
            </li>
            <li>
              <Link
                href="/cuenta"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Mi cuenta
              </Link>
            </li>
            <li>
              <Link
                href="/cuenta/pedidos"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Mis pedidos
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">Información</h3>
          <ul className="space-y-1">
            <li>
              <Link
                href="/como-comprar"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Cómo comprar
              </Link>
            </li>
            <li>
              <Link
                href="/envios"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Envíos
              </Link>
            </li>
            <li>
              <Link
                href="/devoluciones"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Devoluciones
              </Link>
            </li>
            <li>
              <Link
                href="/aviso-privacidad"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Aviso de privacidad
              </Link>
            </li>
            <li>
              <Link
                href="/terminos-condiciones"
                className="hover:text-primary-600 hover:underline transition-colors"
              >
                Términos y condiciones
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">Contacto</h3>
          <p className="mb-2">
            WhatsApp:{" "}
            <a
              href={`https://wa.me/${SITE.waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline transition-colors"
              aria-label="Contactar por WhatsApp"
            >
              +52 {SITE.waPhone.slice(2, 4)} {SITE.waPhone.slice(4, 8)}{" "}
              {SITE.waPhone.slice(8)}
            </a>
          </p>
          <p className="mb-2">
            Email:{" "}
            <a
              href={`mailto:${SITE.email}`}
              className="text-primary-600 hover:underline transition-colors"
              aria-label="Enviar correo electrónico"
            >
              {SITE.email}
            </a>
          </p>
          <p className="mb-2">
            <a
              href={SITE.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline transition-colors"
              aria-label="Ver ubicación en Google Maps"
            >
              Ver ubicación
            </a>
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="font-semibold mb-1 text-gray-900 text-xs">Síguenos</p>
            <div className="flex flex-col gap-1">
              <a
                href={SITE.facebook}
                className="hover:underline hover:text-primary-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Seguir en Facebook"
              >
                Facebook
              </a>
              <a
                href={SITE.instagram}
                className="hover:underline hover:text-primary-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Seguir en Instagram"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 pb-6 pt-4 border-t border-gray-200">
        © {new Date().getFullYear()} {SITE.name} · Todos los derechos
        reservados
      </div>
    </footer>
  );
}
