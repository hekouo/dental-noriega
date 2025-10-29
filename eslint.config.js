import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Recomendadas de JS
  js.configs.recommended,
  // Recomendadas de TypeScript (usa tsconfig del proyecto)
  ...tseslint.configs.recommended,
  // Reglas recomendadas de seguridad
  security.configs.recommended,
  // Reglas de calidad (complejidad, duplicación, etc.)
  sonarjs.configs.recommended,
  // Configuración específica para React/Next.js
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // React Refresh
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // JSX A11y rules básicas
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      // Reglas de seguridad - más permisivas
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-unsafe-regex": "warn",
      // Reglas de TypeScript - más permisivas
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      // Reglas de SonarJS - más permisivas
      "sonarjs/no-ignored-exceptions": "warn",
      "sonarjs/todo-tag": "warn",
      "sonarjs/no-nested-conditional": "warn",
      "sonarjs/unused-import": "warn",
      "sonarjs/no-nested-functions": "warn",
      "sonarjs/concise-regex": "warn",
      "sonarjs/no-dead-store": "warn",
      "sonarjs/no-empty-test-file": "warn",
      "sonarjs/slow-regex": "warn",
      "sonarjs/anchor-precedence": "warn",
      "sonarjs/pseudo-random": "warn",
      "sonarjs/updated-loop-counter": "warn",
      "sonarjs/no-nested-template-literals": "warn",
      "sonarjs/no-commented-code": "warn",
      // Reglas generales
      "no-undef": "off", // TypeScript maneja esto
      "no-empty": "warn",
      "no-useless-escape": "warn",
    },
  },
  // Bloquear imports de rutas DEBUG en UI pública y handlers de API
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/app/api/debug/catalog/route",
              message: "No importes rutas DEBUG en páginas.",
            },
            {
              name: "@/app/api/debug/images-report/route",
              message: "No importes rutas DEBUG en páginas.",
            },
            {
              name: "@/app/api/debug/domains/route",
              message: "No importes rutas DEBUG en páginas.",
            },
          ],
          patterns: ["@/app/api/debug/*", "@/app/api/**/route"],
        },
      ],
    },
  },
  // Regla para prevenir imageUrl camelCase en UI (permitido solo en stores)
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='imageUrl']",
          message:
            "Usa image_url en UI. imageUrl camelCase solo se permite en stores por compat.",
        },
      ],
    },
    ignores: ["src/lib/store/**/*", "src/**/store/**/*"],
  },
  // Configuración para archivos de configuración CommonJS
  {
    files: [
      "**/*.config.{js,cjs}",
      "**/*.config.{ts,cts}",
      "scripts/**/*.{js,ts,mjs}",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        module: "readonly",
        require: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
    },
  },
  // Configuración de ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "playwright-report/**",
      "dist/**",
      "build/**",
      ".vercel/**",
    ],
  },
];
