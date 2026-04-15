import path from "path";
import { generateSW } from "workbox-build";

/* Generate Service Worker */

console.log("Generating service worker...");
const buildDir = path.resolve("../build/next");

generateSW({
  swDest: `${buildDir}/service-worker.js`,
  globDirectory: buildDir,
  globPatterns: [
    // Do not include HTML files here,
    // as deployed app routing won't use .html path.
    "**/*.{js,css,png,jpg,svg,json,woff2,woff}",
  ],
  globIgnores: ["**/service-worker.js"],
  clientsClaim: true,
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
  // Fallback to / for SPA routing
  navigateFallback: "/",
  navigateFallbackDenylist: [
    // Deny /extension from being redirected to /
    new RegExp("^/extension"),
  ],
  additionalManifestEntries: [
    // Fetch and cache root URL when first time online loading the app
    { url: "/", revision: String(Date.now()) },
  ],
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.search.includes("workflow="),
      handler: "NetworkOnly",
      options: {
        cacheName: "workflow-routes",
      },
    },
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
      },
    },
  ],
})
  .then(({ count, size }) => {
    console.log(`Service worker generated. ${count} files, ${size} bytes.`);
  })
  .catch((err) => {
    console.error("Service worker generation failed:", err);
  });
