// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [clerk(), react()],
  // Astro 6: "static" with per-route `prerender = false` is the hybrid model.
  output: "static",
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  env: {
    schema: {
      CONVEX_URL: envField.string({
        access: "public",
        context: "client",
      }),
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      // Clerk's server entry breaks Vite's SSR dep pre-bundle (missing deps_ssr chunk).
      // Exclude so middleware imports @clerk/astro/server directly.
      {
        name: "exclude-clerk-from-ssr-optimize-deps",
        configEnvironment(name) {
          if (name === "ssr" || name === "prerender") {
            return {
              optimizeDeps: {
                exclude: ["@clerk/astro", "@clerk/astro/server"],
              },
            };
          }
        },
      },
    ],
    optimizeDeps: {
      exclude: ["@clerk/astro", "@clerk/astro/server"],
    },
  },
});
