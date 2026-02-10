"use client";

import { Truck, Shield, Award, MessageCircle } from "lucide-react";
import RevealOnScroll from "@/components/motion/RevealOnScroll.client";

const STAGGER_MS = 60;

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
    <section className="py-12 sm:py-16 px-4 bg-stone-50/80 border-t border-stone-200/80">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {trustItems.map((item, index) => (
            <RevealOnScroll key={index} delayMs={index * STAGGER_MS}>
              <div className="bg-white rounded-xl p-6 sm:p-7 border border-stone-200/90 text-center shadow-sm hover-lift tap-feedback">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto bg-amber-50/90 border border-amber-200/70 text-amber-800">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

