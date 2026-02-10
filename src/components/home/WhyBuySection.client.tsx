"use client";

import { MessageCircle } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import RevealOnScroll from "@/components/motion/RevealOnScroll.client";

const STAGGER_MS = 60;

const ShoppingBagIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1={3} y1={6} x2={21} y2={6} />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const PackageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <line x1={16.5} y1={9.4} x2={7.5} y2={4.21} />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1={12} y1={22.08} x2={12} y2={12} />
  </svg>
);
const AwardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <circle cx={12} cy={8} r={7} />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);
const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx={5.5} cy={18.5} r={2.5} />
    <circle cx={18.5} cy={18.5} r={2.5} />
  </svg>
);

const items: { icon: React.ReactNode; title: string; text: string }[] = [
  {
    icon: <ShoppingBagIcon width={24} height={24} />,
    title: "Enfoque en consultorios y clínicas",
    text: "Productos pensados para odontólogos, ortodoncistas y clínicas que compran de forma recurrente.",
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "Atención directa por WhatsApp",
    text: "Te ayudamos a resolver dudas de códigos, medidas, compatibilidad y existencias antes de comprar.",
  },
  {
    icon: <TruckIcon width={24} height={24} />,
    title: "Envíos a todo México",
    text: "Trabajamos con paqueterías confiables y te compartimos tu guía para seguir el pedido en todo momento.",
  },
  {
    icon: <AwardIcon width={24} height={24} />,
    title: "Sistema de puntos de lealtad",
    text: "Cada compra acumula puntos que puedes usar como descuento en pedidos futuros.",
  },
  {
    icon: <PackageIcon width={24} height={24} />,
    title: "Catálogo claro y precios en MXN",
    text: "Ves el precio final en pesos mexicanos, sin sorpresas ni conversiones.",
  },
];

export default function WhyBuySection() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-stone-50/80">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="¿Por qué comprar con Depósito Dental Noriega?"
          subtitle="Comprometidos con la calidad y el servicio para tu consultorio o clínica"
          showWatermark
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {items.map((item, index) => (
            <RevealOnScroll key={index} delayMs={index * STAGGER_MS}>
              <div className="bg-white rounded-xl p-6 sm:p-7 border border-stone-200/90 shadow-sm hover-lift tap-feedback">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-amber-50/90 border border-amber-200/70 text-amber-800">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2 text-gray-900 text-base tracking-tight">
                  {item.title}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {item.text}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
