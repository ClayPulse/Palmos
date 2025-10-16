import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    languageOptions: { globals: globals.browser },
    settings: {
      react: { version: "detect" },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
        project: "./tsconfig.json",
      },
    },
  },
];
