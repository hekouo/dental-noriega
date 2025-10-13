'use client'

import { MessageCircle } from 'lucide-react'
import { generateWhatsAppLink } from '@/lib/utils/whatsapp'

export function WhatsappFloating() {
  const phoneNumber = '525512345678' // Reemplaza con tu número
  const defaultMessage = '¡Hola! Tengo una consulta sobre los productos.'

  return (
    <a
      href={generateWhatsAppLink(phoneNumber, defaultMessage)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors z-50"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  )
}
