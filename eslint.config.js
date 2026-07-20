import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      // Généré par le plugin Vite @lovable.dev/mcp-js à partir de src/lib/mcp/.
      // Toute correction ici serait écrasée au prochain `vite build`.
      "supabase/functions/mcp/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Dette technique assumée et mesurée : ~98 occurrences. En `warn` pour
      // débloquer la CI sans masquer le problème (visible à chaque run).
      "@typescript-eslint/no-explicit-any": "warn",
      // Était "off", ce qui masquait du code mort. Remis en warn.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Edge functions Deno écrites à la main : pas de globals navigateur ici.
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      globals: {
        Deno: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        console: "readonly",
        crypto: "readonly",
      },
    },
    rules: {
      // Pas de composants React dans les edge functions.
      "react-refresh/only-export-components": "off",
    },
  },
);
