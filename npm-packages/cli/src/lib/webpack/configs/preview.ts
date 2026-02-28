/* eslint-disable @typescript-eslint/no-explicit-any */
import CopyWebpackPlugin from "copy-webpack-plugin";
import fs from "fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import { Compiler, Configuration as WebpackConfig } from "webpack";
import { Configuration as DevServerConfig } from "webpack-dev-server";
import { getLocalNetworkIP, loadPulseConfig } from "./utils.js";

class PreviewClientPlugin {
  private projectDirName: string;
  private pulseConfig: any;
  private origin: string;

  constructor(pulseConfig: any) {
    this.projectDirName = process.cwd();
    this.pulseConfig = pulseConfig;
    this.origin = getLocalNetworkIP();
  }

  apply(compiler: Compiler) {
    let isFirstRun = true;

    // Before build starts
    compiler.hooks.watchRun.tap("ReloadMessagePlugin", () => {
      if (!isFirstRun) {
        console.log("[client-preview] 🔄 Reloading app...");
      } else {
        console.log("[client-preview] 🔄 Building app...");
      }
    });

    // After build finishes
    compiler.hooks.done.tap("ReloadMessagePlugin", () => {
      if (isFirstRun) {
        const previewStartupMessage = `
🎉 Your Pulse extension preview \x1b[1m${this.pulseConfig.displayName}\x1b[0m is LIVE! 

⚡️ Local: http://localhost:3030
⚡️ Network: http://${this.origin}:3030

✨ Try it out in your browser and let the magic happen! 🚀
`;

        console.log("[client-preview] ✅ Successfully built preview.");

        const skillActions = this.pulseConfig?.actions || [];

        const actionNames: string[] = skillActions.map((a: any) => a.name);

        if (actionNames.length > 0) {
          console.log(
            "\n🎯 Skill action endpoints:\n" +
              actionNames.map((n) => ` - /skill/${n}`).join("\n") +
              "\n",
          );
        }

        console.log(previewStartupMessage);

        isFirstRun = false;
      } else {
        console.log("[client-preview] ✅ Reload finished");
      }

      // Write pulse config to dist
      fs.writeFileSync(
        path.resolve(this.projectDirName, "dist/pulse.config.json"),
        JSON.stringify(this.pulseConfig, null, 2),
      );
    });
  }
}

export async function makePreviewClientConfig(
  mode: "development" | "production",
): Promise<WebpackConfig & DevServerConfig> {
  const projectDirName = process.cwd();
  const pulseConfig = await loadPulseConfig();

  return {
    mode: mode,
    entry: {
      main: "./node_modules/.pulse/server/preview/frontend/index.js",
    },
    output: {
      path: path.resolve(projectDirName, "dist/client"),
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./node_modules/.pulse/server/preview/frontend/index.html",
      }),
      new MiniCssExtractPlugin({
        filename: "globals.css",
      }),
      new CopyWebpackPlugin({
        patterns: [{ from: "src/assets", to: "assets" }],
      }),
      new PreviewClientPlugin(pulseConfig),
    ],
    watchOptions: {
      ignored: /src\/server-function/,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: [/node_modules/, /dist/],
        },
        {
          test: /\.css$/i,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "postcss-loader",
            },
          ],
        },
      ],
    },
    stats: {
      all: false,
      errors: true,
      warnings: true,
      logging: "warn",
      colors: true,
    },
    infrastructureLogging: {
      level: "warn",
    },
  };
}
