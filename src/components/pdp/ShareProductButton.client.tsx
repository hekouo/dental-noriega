"use client";

import { useState, useEffect } from "react";
import { Share2, Check } from "lucide-react";

type Props = {
  className?: string;
};

export default function ShareProductButton({ className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    const url = window.location.href;

    try {
      // Intentar usar Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        return;
      }

      // Fallback: seleccionar texto y copiar
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");
        setCopied(true);
      } catch (err) {
        console.warn("[ShareProductButton] Fallback copy failed:", err);
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.warn("[ShareProductButton] Copy failed:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${className}`}
      aria-label={copied ? "Link copiado" : "Copiar link del producto"}
    >
      {copied ? (
        <>
          <Check size={16} aria-hidden="true" />
          <span>Copiado</span>
        </>
      ) : (
        <>
          <Share2 size={16} aria-hidden="true" />
          <span>Copiar link</span>
        </>
      )}
    </button>
  );
}

