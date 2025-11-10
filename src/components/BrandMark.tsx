import type { SVGProps } from "react";

const StethoscopeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M4.172 21.12a.5.5 0 0 1-.11-.686l1.83-2.827a1 1 0 0 1 1.218-.304l2.5 1a1 1 0 0 1 .572.893v2.828a.5.5 0 0 1-.724.447l-5.286-2.355Z" />
    <path d="M19.828 21.12a.5.5 0 0 0 .11-.686l-1.83-2.827a1 1 0 0 0-1.218-.304l-2.5 1a1 1 0 0 0-.572.893v2.828a.5.5 0 0 0 .724.447l5.286-2.355Z" />
    <path d="M12 2v20M2 12h20" />
    <path d="M12 2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
  </svg>
);

export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <StethoscopeIcon
          className="h-8 w-8 text-primary-600 md:h-10 md:w-10"
          aria-label="Logo Depósito Dental Noriega"
        />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full md:w-4 md:h-4"></div>
      </div>
      <span className="text-xl font-bold text-gray-800 hidden sm:block">
        Depósito Dental Noriega
      </span>
    </div>
  );
}
