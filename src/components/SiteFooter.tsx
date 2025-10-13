// src/components/SiteFooter.tsx
import Link from 'next/link';
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-4 gap-6 text-sm text-gray-600">
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">{SITE.name}</h3>
          <p>Insumos y equipos dentales. Servicio a clínicas, consultorios y mayoristas.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">Información</h3>
          <ul className="space-y-1">
            <li>
              <Link href="/envios" className="hover:text-primary-600 hover:underline">
                Envíos
              </Link>
            </li>
            <li>
              <Link href="/devoluciones" className="hover:text-primary-600 hover:underline">
                Devoluciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-primary-600 hover:underline">
                Privacidad
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
              className="text-primary-600 hover:underline"
            >
              +52 {SITE.waPhone.slice(2, 4)} {SITE.waPhone.slice(4, 8)} {SITE.waPhone.slice(8)}
            </a>
          </p>
          <p className="mb-2">
            Email:{" "}
            <a 
              href={`mailto:${SITE.email}`} 
              className="text-primary-600 hover:underline"
            >
              {SITE.email}
            </a>
          </p>
          <p>
            <a 
              href={SITE.mapsUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary-600 hover:underline"
            >
              Ver ubicación en Maps
            </a>
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">Síguenos</h3>
          <div className="flex flex-col gap-1">
            <a
              href={SITE.facebook}
              className="hover:underline hover:text-primary-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>
            <a
              href={SITE.instagram}
              className="hover:underline hover:text-primary-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 pb-6">
        © {new Date().getFullYear()} {SITE.name} · Todos los derechos reservados
      </div>
    </footer>
  );
}
