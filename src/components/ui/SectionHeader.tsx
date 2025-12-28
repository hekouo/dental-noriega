import React from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  showWatermark?: boolean;
};

const ToothWatermark = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.05]"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M100 30 C90 30, 85 40, 85 50 L85 70 C85 75, 88 80, 93 82 L100 85 L107 82 C112 80, 115 75, 115 70 L115 50 C115 40, 110 30, 100 30 Z M75 85 L75 95 C75 105, 80 115, 90 120 L100 125 L110 120 C120 115, 125 105, 125 95 L125 85 M70 90 L65 95 L70 100 M130 90 L135 95 L130 100"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function SectionHeader({
  title,
  subtitle,
  rightSlot,
  showWatermark = false,
}: SectionHeaderProps) {
  return (
    <div className="relative mb-6 sm:mb-8">
      {showWatermark && <ToothWatermark />}
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mb-2 relative">
            {title}
            {/* Acento de marca: línea decorativa */}
            <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-primary-600 rounded-full" aria-hidden="true" />
          </h2>
          {subtitle && (
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}

