/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleFederationPlugin } from "@module-federation/enhanced/webpack";
import CopyWebpackPlugin from "copy-webpack-plugin";
import fs from "fs";
import { globSync } from "glob";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import ts from "typescript";
import { Compiler, Configuration as WebpackConfig } from "webpack";
import { Configuration as DevServerConfig } from "webpack-dev-server";
import {
  discoverAppActions,
  getLocalNetworkIP,
  loadPulseConfig,
} from "./utils.js";

class MFClientPlugin {
  private projectDirName: string;
  private pulseConfig: any;
  private origin: string;

  constructor(pulseConfig: any) {
    this.projectDirName = process.cwd();
    this.pulseConfig = pulseConfig;
    this.origin = getLocalNetworkIP();
  }

  apply(compiler: Compiler) {
    if (compiler.options.mode === "development") {
      let isFirstRun = true;

      // Before build starts
      compiler.hooks.watchRun.tap("ReloadMessagePlugin", () => {
        if (!isFirstRun) {
          console.log("[client] 🔄 reloading app...");
        } else {
          console.log("[client] 🔄 building app...");
        }
      });

      // Log file updates
      compiler.hooks.invalid.tap("LogFileUpdates", (file, changeTime) => {
        console.log(
          `[watch] change detected in: ${file} at ${new Date(
            changeTime || Date.now(),
          ).toLocaleTimeString()}`,
        );
      });

      const devStartupMessage = `
🎉 Your Pulse extension \x1b[1m${this.pulseConfig.displayName}\x1b[0m is LIVE! 

⚡️ Local: http://localhost:3030/${this.pulseConfig.id}/${this.pulseConfig.version}/
⚡️ Network: http://${this.origin}:3030/${this.pulseConfig.id}/${this.pulseConfig.version}/

✨ Try it out in the Pulse Editor and let the magic happen! 🚀
`;

      // After build finishes
      compiler.hooks.done.tap("ReloadMessagePlugin", () => {
        if (isFirstRun) {
          console.log("[client] ✅ Successfully built client.");
          console.log(devStartupMessage);
          isFirstRun = false;
        } else {
          console.log("[client] ✅ Reload finished.");
        }

        // Write pulse config to dist
        fs.writeFileSync(
          path.resolve(this.projectDirName, "dist/pulse.config.json"),
          JSON.stringify(this.pulseConfig, null, 2),
        );
      });
    } else {
      // Print build success/failed message
      compiler.hooks.done.tap("BuildMessagePlugin", (stats) => {
        if (stats.hasErrors()) {
          console.log(`[client] ❌ Failed to build client.`);
        } else {
          console.log(`[client] ✅ Successfully built client.`);

          // Write pulse config to dist
          fs.writeFileSync(
            path.resolve(this.projectDirName, "dist/pulse.config.json"),
            JSON.stringify(this.pulseConfig, null, 2),
          );
        }
      });
    }

    compiler.hooks.beforeCompile.tap("PulseConfigPlugin", () => {
      let requireFS = false;

      function isWorkspaceHook(node: ts.Node): boolean {
        return (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          [
            "useFileSystem",
            "useFile",
            "useReceiveFile",
            "useTerminal",
            "useWorkspaceInfo",
          ].includes(node.expression.text)
        );
      }

      function scanSource(sourceText: string) {
        const sourceFile = ts.createSourceFile(
          "temp.tsx",
          sourceText,
          ts.ScriptTarget.Latest,
          true,
        );

        const visit = (node: ts.Node) => {
          // Detect: useFileSystem(...)
          if (isWorkspaceHook(node)) {
            requireFS = true;
          }

          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
      }

      globSync(["src/**/*.tsx", "src/**/*.ts"]).forEach((file) => {
        const source = fs.readFileSync(file, "utf8");
        scanSource(source);
      });

      // Persist result
      this.pulseConfig.requireWorkspace = requireFS;
    });
  }
}

export async function makeMFClientConfig(
  mode: "development" | "production",
): Promise<WebpackConfig & DevServerConfig> {
  const projectDirName = process.cwd();
  const pulseConfig = await loadPulseConfig();

  const mainComponent = "./src/main.tsx";

  const actions = discoverAppActions();

  return {
    mode: mode,
    name: "client",
    entry: mainComponent,
    output: {
      publicPath: "auto",
      path: path.resolve(projectDirName, "dist/client"),
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "globals.css",
      }),
      // Copy assets to dist
      new CopyWebpackPlugin({
        patterns: [{ from: "src/assets", to: "assets" }],
      }),
      new ModuleFederationPlugin({
        // Do not use hyphen character '-' in the name
        name: pulseConfig.id + "_client",
        filename: "remoteEntry.js",
        exposes: {
          "./main": mainComponent,
          ...actions,
        },
        shared: {
          react: {
            requiredVersion: "19.2.0",
            import: "react", // the "react" package will be used a provided and fallback module
            shareKey: "react", // under this name the shared module will be placed in the share scope
            shareScope: "default", // share scope with this name will be used
            singleton: true, // only a single version of the shared module is allowed
          },
          "react-dom": {
            requiredVersion: "19.2.0",
            singleton: true, // only a single version of the shared module is allowed
          },
        },
      }),
      new MFClientPlugin(pulseConfig),
    ],
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
          exclude: [/dist/],
        },
      ],
    },

    stats: {
      all: false,
      errors: true,
      warnings: true,
      logging: "warn",
      colors: true,
      assets: false,
    },
    infrastructureLogging: {
      level: "warn",
    },
  };
}
