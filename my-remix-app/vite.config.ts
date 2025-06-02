import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
  // Regarding static asset caching:
  // Vite's 'public' directory serves assets statically.
  // - For assets processed by Vite/Remix (JS/CSS bundles), fingerprinting is typically
  //   applied automatically, allowing for long-term caching (e.g., 'public, max-age=31536000, immutable').
  //   This is usually configured on your production static file server (e.g., Nginx, Vercel, Netlify).
  // - For assets in 'public' that are not fingerprinted (e.g., favicon.ico, robots.txt),
  //   consider a shorter cache duration or 'no-cache' to ensure updates are picked up.
  //   This also needs to be configured on the production server.
  // This vite.config.ts doesn't directly control these production cache headers.
});
