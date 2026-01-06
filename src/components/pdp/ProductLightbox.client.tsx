"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeImageUrl } from "@/lib/img/normalizeImageUrl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  alt: string;
};

export default function ProductLightbox({
  open,
  onOpenChange,
  images,
  activeIndex,
  onActiveIndexChange,
  alt,
}: Props) {
  const currentImage = images[activeIndex];
  const hasMultipleImages = images.length > 1;

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Navegación con teclado
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }

      if (!hasMultipleImages) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeIndex > 0) {
          onActiveIndexChange(activeIndex - 1);
        }
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (activeIndex < images.length - 1) {
          onActiveIndexChange(activeIndex + 1);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, activeIndex, images.length, hasMultipleImages, onOpenChange, onActiveIndexChange]);

  const handlePrevious = useCallback(() => {
    if (activeIndex > 0) {
      onActiveIndexChange(activeIndex - 1);
    }
  }, [activeIndex, onActiveIndexChange]);

  const handleNext = useCallback(() => {
    if (activeIndex < images.length - 1) {
      onActiveIndexChange(activeIndex + 1);
    }
  }, [activeIndex, images.length, onActiveIndexChange]);

  const handleThumbnailClick = useCallback(
    (index: number) => {
      onActiveIndexChange(index);
    },
    [onActiveIndexChange],
  );

  if (!open || !currentImage) return null;

  const normalizedUrl = normalizeImageUrl(currentImage, 1200);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 dark:bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de imagen"
      onClick={() => onOpenChange(false)}
    >
      {/* Botón cerrar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(false);
        }}
        className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 dark:hover:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full p-2 bg-black/50 dark:bg-black/70 hover:bg-black/70 dark:hover:bg-black/80"
        aria-label="Cerrar vista ampliada"
      >
        <X size={24} aria-hidden="true" />
      </button>

      {/* Botones de navegación */}
      {hasMultipleImages && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            disabled={activeIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 dark:bg-black/70 hover:bg-black/70 dark:hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={activeIndex === images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 dark:bg-black/70 hover:bg-black/70 dark:hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Imagen siguiente"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        </>
      )}

      {/* Imagen principal */}
      <div
        className="flex-1 flex items-center justify-center w-full max-w-7xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={normalizedUrl}
          alt={`${alt} - Vista ampliada ${activeIndex + 1}`}
          width={1200}
          height={1200}
          className="max-w-full max-h-full object-contain"
          sizes="100vw"
          priority
        />
      </div>

      {/* Indicador de imagen */}
      {hasMultipleImages && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 dark:bg-black/70 px-3 py-1.5 rounded-full">
          {activeIndex + 1} / {images.length}
        </div>
      )}

      {/* Thumbnails strip */}
      {hasMultipleImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar justify-center">
            {images.map((image, index) => {
              const thumbUrl = normalizeImageUrl(image, 100);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleThumbnailClick(index);
                  }}
                  className={`flex-shrink-0 relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    activeIndex === index
                      ? "border-white ring-2 ring-white/50"
                      : "border-white/30 hover:border-white/60"
                  }`}
                  aria-label={`Ver imagen ${index + 1} de ${images.length}`}
                  aria-pressed={activeIndex === index}
                >
                  <Image
                    src={thumbUrl}
                    alt={`${alt} - Miniatura ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    sizes="64px"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

