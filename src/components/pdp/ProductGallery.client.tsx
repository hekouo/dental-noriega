"use client";

import { useState } from "react";
import Image from "next/image";
import { normalizeImageUrl } from "@/lib/img/normalizeImageUrl";

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

  // Si no hay imágenes, usar fallback
  const displayImages =
    images.length > 0 ? images : fallbackImage ? [{ url: fallbackImage }] : [];

  if (displayImages.length === 0) {
    return (
      <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          Sin imagen
        </div>
      </div>
    );
  }

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  const currentImage = displayImages[selectedIndex];
  const normalizedUrl = normalizeImageUrl(currentImage.url, 800);

  return (
    <div className="space-y-4">
      {/* Desktop: Layout con thumbnails verticales */}
      <div className="hidden lg:flex gap-4">
        {/* Thumbnails verticales (izquierda) */}
        {displayImages.length > 1 && (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-2">
            {displayImages.map((image, index) => {
              const thumbUrl = normalizeImageUrl(image.url, 100);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleThumbnailClick(index)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0 ${
                    selectedIndex === index
                      ? "border-primary-600 dark:border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  aria-label={`Ver imagen ${index + 1} de ${displayImages.length}`}
                  aria-pressed={selectedIndex === index}
                >
                  <Image
                    src={thumbUrl}
                    alt={`${title} - Miniatura ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    sizes="80px"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Imagen principal */}
        <div className="relative flex-1 aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
          <Image
            src={normalizedUrl}
            alt={`${title} - Imagen ${selectedIndex + 1}`}
            width={800}
            height={800}
            className="w-full h-full object-contain"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={selectedIndex === 0}
          />
        </div>
      </div>

      {/* Mobile: Layout con thumbnails horizontales */}
      <div className="lg:hidden space-y-4">
        {/* Imagen principal */}
        <div className="relative w-full aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
          <Image
            src={normalizedUrl}
            alt={`${title} - Imagen ${selectedIndex + 1}`}
            width={800}
            height={800}
            className="w-full h-full object-contain"
            sizes="100vw"
            priority={selectedIndex === 0}
          />

          {/* Indicador de imagen actual */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 dark:bg-black/70 text-white text-xs px-2 py-1 rounded">
              {selectedIndex + 1} / {displayImages.length}
            </div>
          )}
        </div>

        {/* Thumbnails horizontales */}
        {displayImages.length > 1 && (
          <div className="w-full">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
              {displayImages.map((image, index) => {
                const thumbUrl = normalizeImageUrl(image.url, 100);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleThumbnailClick(index)}
                    className={`flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      selectedIndex === index
                        ? "border-primary-600 dark:border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    aria-label={`Ver imagen ${index + 1} de ${displayImages.length}`}
                    aria-pressed={selectedIndex === index}
                  >
                    <Image
                      src={thumbUrl}
                      alt={`${title} - Miniatura ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      sizes="80px"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

