import path from "path";
import { generateSW } from "workbox-build";

/* Generate Service Worker */

console.log("Generating service worker...");
const buildDir = path.resolve("../build/next");

generateSW({
  swDest: `${buildDir}/service-worker.js`,
  globDirectory: buildDir,
  globPatterns: ["**/*.{html,js,css,png,jpg,svg,json}"],
  clientsClaim: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
})
  .then(({ count, size }) => {
    console.log(`Service worker generated. ${count} files, ${size} bytes.`);
  })
  .catch((err) => {
    console.error("Service worker generation failed:", err);
  });
