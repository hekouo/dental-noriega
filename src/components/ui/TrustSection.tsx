"use client";

import { Truck, Shield, Award, MessageCircle } from "lucide-react";

type TrustItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const trustItems: TrustItem[] = [
  {
    icon: <Truck className="w-6 h-6" />,
    title: "Envíos a todo México",
    description: "Trabajamos con paqueterías confiables y te compartimos tu guía de seguimiento.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Pago seguro",
    description: "Procesamos pagos con Stripe. Tus datos están protegidos.",
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "Facturación disponible",
    description: "Emitimos facturas electrónicas para tu contabilidad.",
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "Atención rápida",
    description: "Resolvemos dudas por WhatsApp en minutos, no horas.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-12 sm:py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-shadow duration-200"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4 mx-auto">
                {item.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

