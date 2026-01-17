import path from "path";
import { generateSW } from "workbox-build";

/* Generate Service Worker */

console.log("Generating service worker...");
const buildDir = path.resolve("../build/next");

generateSW({
  swDest: `${buildDir}/service-worker.js`,
  globDirectory: buildDir,
  globPatterns: ["**/*.{js,css,png,jpg,svg,json,woff2,woff}"],
  globIgnores: ["**/service-worker.js"],
  clientsClaim: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
  navigateFallback: "/",
  additionalManifestEntries: [{ url: "/", revision: null }],
})
  .then(({ count, size }) => {
    console.log(`Service worker generated. ${count} files, ${size} bytes.`);
  })
  .catch((err) => {
    console.error("Service worker generation failed:", err);
  });
