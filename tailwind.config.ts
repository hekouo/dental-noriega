// tailwind.config.ts
import type { Config } from "tailwindcss";
import * as colors from "tailwindcss/colors";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Recupera clases como text-primary-600 / bg-primary-100
        primary: {
          ...colors.blue,
          DEFAULT: colors.blue[600],
          foreground: colors.white,
        },
      },
    },
  },
  // Evita el drama de esModuleInterop usando require en tiempo de ejecución
  plugins: [require("tailwindcss-animate")],
};

export default config;
