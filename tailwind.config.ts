// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    // Tu proyecto vive bajo src/, con app/ y components/ adentro
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta primary para que sigan funcionando text-primary-600, bg-primary-100, etc.
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb", // uso principal (botón)
          700: "#1d4ed8", // hover
          800: "#1e40af",
          900: "#1e3a8a",
          DEFAULT: "#2563eb", // habilita clases 'text-primary' y 'bg-primary'
          foreground: "#ffffff",
        },
      },
    },
  },
  // Plugin de animación sin esModuleInterop drama
  plugins: [require("tailwindcss-animate")],
};

export default config;
