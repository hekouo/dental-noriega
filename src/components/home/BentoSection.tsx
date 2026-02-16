import {
  MessageCircle,
  Truck,
  Shield,
  FileText,
} from "lucide-react";
import GlassCard from "@/components/common/GlassCard";
import { cn } from "@/lib/utils";

const tiles = [
  {
    title: "Atención a clínicas y doctores",
    description: "Asesoría dedicada para tu consultorio.",
    Icon: MessageCircle,
    className: "col-span-2",
  },
  {
    title: "Envíos a todo México",
    description: "Entregas seguras y rastreables.",
    Icon: Truck,
    className: "",
  },
  {
    title: "Pago seguro",
    description: "Procesamiento confiable de pagos.",
    Icon: Shield,
    className: "",
  },
  {
    title: "Factura y soporte",
    description: "Facturación electrónica y soporte postventa.",
    Icon: FileText,
    className: "col-span-2",
  },
];

export default function BentoSection() {
  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
      aria-labelledby="bento-trust-heading"
    >
      <h2
        id="bento-trust-heading"
        className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center"
      >
        Confianza y servicio
      </h2>
      <p className="text-muted-foreground text-center max-w-xl mx-auto mb-8 sm:mb-10 text-sm sm:text-base">
        Pensado para clínicas y profesionales: atención personalizada, envíos nacionales y soporte continuo.
      </p>

      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5",
          "auto-rows-fr"
        )}
      >
        {tiles.map(({ title, description, Icon, className }) => (
          <GlassCard
            key={title}
            className={cn(
              "p-5 sm:p-6 flex flex-col gap-3 min-h-[120px]",
              "border border-gray-200/80 dark:border-gray-700/60",
              className
            )}
          >
            <div
              className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0"
              aria-hidden
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                {title}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                {description}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
