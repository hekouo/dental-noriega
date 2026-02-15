"use client";

/**
 * AmbientBackground: gradiente animado MUY sutil para hero.
 * Desactiva animación con prefers-reduced-motion (fallback gradiente fijo).
 */
export default function AmbientBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden ambient-gradient"
      style={{
        background:
          "linear-gradient(135deg, rgba(255, 251, 235, 0.5) 0%, transparent 40%, transparent 60%, rgba(245, 245, 244, 0.3) 100%)",
        backgroundSize: "200% 200%",
      }}
      aria-hidden
    />
  );
}
