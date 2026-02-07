"use client";

import { useState, useRef } from "react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

type ProductImage = {
  url: string;
  is_primary?: boolean | null;
};

type Props = {
  images: ProductImage[];
  title: string;
  fallbackImage?: string | null;
};

export default function ProductGallery({ images, title, fallbackImage }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // Si no hay imágenes, usar fallback
  const displayImages = images.length > 0 ? images : fallbackImage ? [{ url: fallbackImage }] : [];

  if (displayImages.length === 0) {
    return (
      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          Sin imagen
        </div>
      </div>
    );
  }

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleSwipeEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedIndex < displayImages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (isRightSwipe && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex < displayImages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const currentImage = displayImages[selectedIndex];

  return (
    <>
      <div className="space-y-4">
        {/* Imagen principal */}
        <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="w-full h-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
            aria-label={`Ver imagen ${selectedIndex + 1} de ${displayImages.length} en pantalla completa`}
          >
            <div
              className="w-full h-full touch-none"
              onTouchStart={handleSwipeStart}
              onTouchMove={handleSwipeMove}
              onTouchEnd={handleSwipeEnd}
            >
              <ImageWithFallback
                key={currentImage.url}
                src={currentImage.url}
                alt={`${title} - Imagen ${selectedIndex + 1}`}
                width={800}
                height={800}
                className="w-full h-full object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={selectedIndex === 0}
              />
            </div>
          </button>

          {/* Indicadores de navegación en móvil (solo si hay más de 1 imagen) */}
          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevious}
                disabled={selectedIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full p-2 md:hidden focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Imagen anterior"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={selectedIndex === displayImages.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full p-2 md:hidden focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Imagen siguiente"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Indicador de imagen actual (móvil) */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded md:hidden">
              {selectedIndex + 1} / {displayImages.length}
            </div>
          )}
        </div>

        {/* Miniaturas */}
        {displayImages.length > 1 && (
          <div className="w-full">
            <div className="w-full max-w-full flex gap-2 overflow-x-auto overflow-y-hidden pb-2 -mx-2 px-2">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleThumbnailClick(index)}
                  className={`flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    selectedIndex === index
                      ? "border-primary-600 ring-2 ring-primary-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  aria-label={`Ver imagen ${index + 1} de ${displayImages.length}`}
                  aria-pressed={selectedIndex === index}
                >
                  <ImageWithFallback
                    src={image.url}
                    alt={`${title} - Miniatura ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    sizes="80px"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de imagen"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded-full p-2"
            aria-label="Cerrar vista ampliada"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                disabled={selectedIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full p-3 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Imagen anterior"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                disabled={selectedIndex === displayImages.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full p-3 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Imagen siguiente"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          <div
            className="max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageWithFallback
              key={`lightbox-${currentImage.url}`}
              src={currentImage.url}
              alt={`${title} - Vista ampliada`}
              width={1200}
              height={1200}
              className="max-w-full max-h-full object-contain"
              sizes="100vw"
            />
          </div>

          {displayImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {selectedIndex + 1} / {displayImages.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

