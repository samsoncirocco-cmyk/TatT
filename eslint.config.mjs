import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Deep-module boundaries (ADR-0001): internals are only importable from
    // within the owning module. Everyone else goes through the entry point.
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/services/generation/**", "src/services/council/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/generation/internal/*", "@/services/generation/internal/*"],
              message:
                "generation/internal is module-private (ADR-0001). Import from '@/services/generation' instead.",
            },
            {
              group: ["**/council/internal/*", "@/services/council/internal/*"],
              message:
                "council/internal is module-private (ADR-0002). Import from '@/services/council' instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
