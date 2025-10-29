import { Stethoscope } from "lucide-react";

export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Stethoscope 
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
