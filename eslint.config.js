import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importX from "eslint-plugin-import-x";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      "import-x": importX,
      "security": security,
      "sonarjs": sonarjs
    },
    settings: {
      "import-x/resolver": {
        typescript: {
          project: "./tsconfig.json"
        }
      }
    },
    extends: [
      "plugin:security/recommended",
      "plugin:sonarjs/recommended"
    ],
    rules: {
      "import-x/no-unresolved": "error",
      "import-x/order": [
        "warn",
        {
          "newlines-between": "always",
          "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
          "alphabetize": { "order": "asc" }
        }
      ],
      "no-console": ["error", { "allow": ["warn", "error"] }],
      "no-debugger": "error"
    }
  }
];
