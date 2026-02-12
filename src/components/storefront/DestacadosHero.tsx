import { Truck, MessageCircle, Award } from "lucide-react";

/**
 * Hero editorial para /destacados: título, subtítulo y bullets de confianza.
 * Server/simple, sin client.
 */
export default function DestacadosHero() {
  const bullets = [
    {
      icon: Truck,
      title: "Envío rápido",
      description: "Entrega en tiempo récord",
    },
    {
      icon: MessageCircle,
      title: "Atención WhatsApp",
      description: "Soporte personalizado",
    },
    {
      icon: Award,
      title: "Puntos de lealtad",
      description: "Gana con cada compra",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-4 pt-16 sm:pt-20 pb-10 sm:pb-14">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 scroll-mt-20">
            Productos destacados
          </h1>
          <p className="text-base sm:text-lg text-primary-100 max-w-2xl mx-auto">
            Productos recomendados que suelen interesar a nuestros clientes. Curación visual para tu consultorio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8">
          {bullets.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center p-4 rounded-lg bg-white/10 backdrop-blur-sm"
            >
              <Icon className="w-8 h-8 mb-2" aria-hidden />
              <h2 className="font-semibold text-sm sm:text-base mb-1">{title}</h2>
              <p className="text-xs sm:text-sm text-primary-100">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
