"use client";

import { usePathname } from "next/navigation";
import { SITE, waLink } from "@/lib/site";
import FAB from "@/components/FAB";

export default function WhatsappBubble() {
  const pathname = usePathname();
  const msg = `Hola, vengo desde ${SITE.name}. Página: ${pathname}. ¿Me ayudas?`;
  const href = waLink(msg);

  return (
    <FAB offset={16}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatear por WhatsApp"
        className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-xl flex items-center justify-center transition-all hover:scale-110"
      >
        <svg
          viewBox="0 0 32 32"
          width="26"
          height="26"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M19.1 17.6c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2c-.2.2-.4.3-.7.1s-1.4-.5-2.6-1.6c-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3c.2.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3 0-.2-.2-.3-.4-.4z" />
          <path d="M26.7 5.3C23.9 2.4 20.1.9 16.1.9 8.4.9 2.1 7.2 2.1 14.9c0 2.3.6 4.6 1.8 6.6L2 31l9.6-2.5c1.9 1 4 1.5 6.2 1.5h.1c7.7 0 14-6.3 14-14 0-3.8-1.5-7.3-4.2-10.7zm-10.6 21.5c-2 0-4-.5-5.7-1.5l-.4-.3-4.2 1.1 1.1-4.1-.3-.4c-1.2-1.9-1.8-4.1-1.8-6.4 0-6.6 5.4-12 12-12 3.2 0 6.2 1.2 8.5 3.5s3.5 5.3 3.5 8.5c0 6.6-5.4 12-12 12z" />
        </svg>
      </a>
    </FAB>
  );
}
