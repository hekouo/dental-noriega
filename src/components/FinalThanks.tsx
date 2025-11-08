"use client";

import Image from "next/image";
import { SITE, waLink } from "@/lib/site";
import buttonStyles from "@/components/ui/button.module.css";

export default function FinalThanks() {
  const msg = `Hola, vengo desde ${SITE.name}.`;
  const wa = waLink(msg);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(wa)}`;

  return (
    <section className="mt-16 rounded-2xl border bg-white shadow-sm p-6 grid md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          Gracias por revisar el catálogo
        </h2>
        <p className="text-gray-600 mb-4">
          Estamos listos para ayudarte con tus compras y dudas técnicas.
          Escríbenos y con gusto te atendemos.
        </p>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              +52 {SITE.waPhone.slice(2, 5)} {SITE.waPhone.slice(5, 8)}{" "}
              {SITE.waPhone.slice(8)}
            </a>
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a
              href={`mailto:${SITE.email}`}
              className="text-primary-600 hover:underline"
            >
              {SITE.email}
            </a>
          </li>
          <li>
            <strong>Ubicación:</strong>{" "}
            <a
              href={SITE.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Ver en Google Maps
            </a>
          </li>
        </ul>

        <div className="mt-4 flex flex-col sm:flex-row items-start gap-3">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonStyles.primary} px-4 py-2`}
          >
            <span>Escribir por WhatsApp</span>
          </a>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <a
              href={SITE.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-primary-600"
            >
              Facebook
            </a>
            <a
              href={SITE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-primary-600"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>

      <div className="flex md:justify-end">
        <div className="p-3 bg-white rounded-xl border">
          <Image
            src={qr}
            alt="Escanea para WhatsApp"
            width={180}
            height={180}
            sizes="180px"
            className="w-full h-auto"
          />
          <p className="text-xs text-center text-gray-500 mt-2">
            Escanéame para WhatsApp
          </p>
        </div>
      </div>
    </section>
  );
}
