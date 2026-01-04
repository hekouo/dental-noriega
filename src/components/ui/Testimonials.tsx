"use client";

import { Star } from "lucide-react";

type Testimonial = {
  name: string;
  role: string;
  text: string;
  rating: number;
};

const testimonials: Testimonial[] = [
  {
    name: "Dr. María González",
    role: "Clínica dental",
    text: "Excelente servicio y productos de calidad. Los envíos siempre llegan a tiempo y el soporte por WhatsApp es muy rápido.",
    rating: 5,
  },
  {
    name: "Dr. Carlos Ramírez",
    role: "Ortodoncista",
    text: "Llevo años comprando aquí. Los precios son competitivos y la atención personalizada hace la diferencia.",
    rating: 5,
  },
  {
    name: "Clínica Dental San José",
    role: "Clínica",
    text: "Productos confiables y facturación sin problemas. Recomendado para clínicas que necesitan abastecerse regularmente.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="py-12 sm:py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
          Lo que dicen nuestros clientes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                "{testimonial.text}"
              </p>
              <div className="pt-4 border-t border-gray-200">
                <p className="font-semibold text-gray-900 text-sm">
                  {testimonial.name}
                </p>
                <p className="text-xs text-gray-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

