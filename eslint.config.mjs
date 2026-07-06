import convexPlugin from "@convex-dev/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".astro/",
      ".wrangler/",
      ".convex/",
      "**/convex/_generated/",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  ...convexPlugin.configs.recommended,
];
