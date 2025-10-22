// tailwind.config.ts
import type { Config } from "tailwindcss";

// Usa require SIN redeclararlo. No toques tsconfig.
const animate = require("tailwindcss-animate");

const config = {
  darkMode: ["class"],
  content: ["./{src,app,components,lib}/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          DEFAULT: "#2563eb",
        },
      },
    },
  },
  plugins: [animate],
} satisfies Config;

export default config;
