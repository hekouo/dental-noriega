// src/components/ui/Toast.tsx
"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

type ToastProps = {
  message: string;
  type?: "error" | "success" | "info";
  duration?: number;
  onClose?: () => void;
};

export default function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Delay para animación
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  let bgColor: string;
  if (type === "error") {
    bgColor = "bg-red-50 border-red-200 text-red-800";
  } else if (type === "success") {
    bgColor = "bg-green-50 border-green-200 text-green-800";
  } else {
    bgColor = "bg-blue-50 border-blue-200 text-blue-800";
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-4 right-4 z-50 max-w-md p-4 border rounded-lg shadow-lg transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${bgColor}`}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm">{message}</p>
        <button
          onClick={handleClose}
          aria-label="Cerrar notificación"
          className="text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

type ToastContainerProps = {
  children?: React.ReactNode;
};

export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {children}
    </div>
  );
}
