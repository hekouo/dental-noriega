// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  // Incluye src/* (tu estructura real) y, por si acaso, también las rutas raíz
  content: [
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/app/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/components/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/lib/**/*.{ts,tsx,js,jsx,mdx}",
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./lib/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta primary restaurada para que no se rompan las clases primary-*
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb", // default para botones
          700: "#1d4ed8", // hover
          800: "#1e40af",
          900: "#1e3a8a",
          DEFAULT: "#2563eb",
        },
      },
    },
  },
  // Usa require() para evitar líos de esModuleInterop en TS
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
