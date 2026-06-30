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
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Avoid stale/missing deps_ssr chunk errors when deps re-optimize mid-request.
      ignoreOutdatedRequests: true,
      exclude: [
        "@clerk/backend",
        "convex",
        "convex/react",
        "convex/react-clerk",
      ],
    },
  },
});
