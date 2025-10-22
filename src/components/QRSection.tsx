"use client";

const PHONE = process.env.NEXT_PUBLIC_WA_PHONE || "525531033715";
const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "DENTAL NORIEGA";

export default function QRSection() {
  const msg = encodeURIComponent(`Hola, vengo desde ${SITE}.`);
  const wa = `https://wa.me/${PHONE}?text=${msg}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wa)}`;

  return (
    <div className="flex items-center gap-4 p-4 border rounded-xl bg-white">
      <img
        src={qr}
        alt="QR WhatsApp"
        width={200}
        height={200}
        className="flex-shrink-0"
      />
      <div className="text-sm text-gray-600">
        <p className="mb-2">Escanéalo para escribirnos por WhatsApp.</p>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline inline-block"
        >
          Abrir WhatsApp
        </a>
      </div>
    </div>
  );
}
