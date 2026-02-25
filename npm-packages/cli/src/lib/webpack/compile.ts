import webpack from "webpack";
import { generateTempTsConfig } from "./configs/utils.js";
import { createWebpackConfig } from "./webpack-config.js";

export async function webpackCompile(
  mode: "development" | "production" | "preview",
  buildTarget?: "client" | "server",
  isWatchMode = false,
) {
  generateTempTsConfig();

  const configs = await createWebpackConfig(
    mode === "preview",
    buildTarget ?? "both",
    mode === "development"
      ? "development"
      : mode === "preview"
        ? "development"
        : "production",
  );

  const compiler = webpack(configs);

  if (isWatchMode) {
    compiler.watch({}, (err, stats) => {
      if (err) {
        console.error("❌ Webpack build failed", err);
        return;
      }
    });

    return compiler;
  }

  return new Promise<void>((resolve, reject) => {
    compiler.run((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
