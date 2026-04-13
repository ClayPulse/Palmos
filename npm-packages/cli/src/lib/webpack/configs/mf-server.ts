/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import { rspack, type Compiler, type RspackOptions } from "@rspack/core";
import fs from "fs";
import path from "path";
import {
  compileAppActionSkills,
  discoverAppSkillActions,
  discoverServerFunctions,
  loadPulseConfig,
} from "./utils.js";

class MFServerPlugin {
  private projectDirName: string;
  private pulseConfig: any;

  constructor(pulseConfig: any) {
    this.projectDirName = process.cwd();
    this.pulseConfig = pulseConfig;
  }

  apply(compiler: Compiler) {
    if (compiler.options.mode === "development") {
      let isFirstRun = true;

      compiler.hooks.environment.tap("WatchFileChangesPlugin", () => {
        // Watch for file changes in the server-function directory to trigger server-function rebuilds
        compiler.hooks.thisCompilation.tap(
          "WatchServerFunctions",
          (compilation) => {
            compilation.contextDependencies.add(
              path.resolve(this.projectDirName, "src/server-function"),
            );
          },
        );

        // Watch for file changes in the action directory to trigger action rebuilds
        compiler.hooks.thisCompilation.tap("WatchActions", (compilation) => {
          compilation.contextDependencies.add(
            path.resolve(this.projectDirName, "src/skill"),
          );
        });
      });

      // Before build starts
      compiler.hooks.beforeRun.tap("CleanDistPlugin", () => {
        this.cleanServerDist();
      });

      // When a file changes and triggers a new compilation
      compiler.hooks.watchRun.tapPromise("ReloadMessagePlugin", async (compiler) => {
        this.printChanges(compiler);

        if (!isFirstRun) {
          console.log(`[Server] 🔄 Reloading app...`);
          const isServerFunctionChange = compiler.modifiedFiles
            ? Array.from(compiler.modifiedFiles).some((file) =>
                file.includes("src/server-function"),
              )
            : false;

          if (isServerFunctionChange) {
            await this.compileServerFunctions(compiler);
          }

          const isActionChange = compiler.modifiedFiles
            ? Array.from(compiler.modifiedFiles).some((file) =>
                file.includes("src/skill"),
              )
            : false;

          if (isActionChange) {
            console.log(`[Server] Detected changes in actions. Recompiling...`);
            this.pulseConfig = compileAppActionSkills(this.pulseConfig);
            this.saveConfig();
          }
        } else {
          console.log(`[Server] 🔄 Building app...`);
          await this.compileServerFunctions(compiler);
          this.pulseConfig = compileAppActionSkills(this.pulseConfig);
          this.saveConfig();
          console.log(`[Server] ✅ Successfully built server.`);

          const funcs = discoverServerFunctions();

          console.log(`\n🛜 Server functions:
${Object.entries(funcs)
  .map(([name, file]) => {
    return `  - ${name.slice(2)} (from ${file})`;
  })
  .join("\n")}
`);
        }
      });

      // After build finishes
      compiler.hooks.done.tap("ReloadMessagePlugin", () => {
        if (isFirstRun) {
          isFirstRun = false;
        } else {
          console.log(`[Server] ✅ Reload finished.`);
        }
      });
    } else {
      // Print build success/failed message
      compiler.hooks.done.tapPromise("BuildMessagePlugin", async (stats) => {
        if (stats.hasErrors()) {
          console.log(`[Server] ❌ Failed to build server.`);
        } else {
          try {
            await this.compileServerFunctions(compiler);
            this.pulseConfig = compileAppActionSkills(this.pulseConfig);
            this.saveConfig();
          } catch (err) {
            console.error(`[Server] ❌ Error during compilation:`, err);
            process.exit(1);
          }
          console.log(`[Server] ✅ Successfully built server.`);
        }
      });
    }
  }

  private cleanServerDist() {
    // Remove existing entry points
    try {
      fs.rmSync("dist/server", { recursive: true, force: true });
    } catch (e) {
      console.error("Error removing dist/server:", e);
      console.log("Continuing...");
    }
  }

  private saveConfig() {
    const filePath = path.resolve(
      this.projectDirName,
      "dist/pulse.config.json",
    );
    fs.writeFileSync(filePath, JSON.stringify(this.pulseConfig, null, 2));
  }

  /**
   * Programmatically call rspack to compile server functions
   * whenever there are changes in the src/server-function directory.
   */
  private async compileServerFunctions(compiler: Compiler) {
    const options: any = {
      ...compiler.options,
      watch: false,
      plugins: [
        this.makeNodeFederationPlugin(),
      ],
    };
    const newCompiler = rspack(options);

    return new Promise<void>((resolve, reject) => {
      newCompiler?.run((err, stats) => {
        if (err) {
          console.error(`[Server] ❌ Error during recompilation:`, err);
          reject(err);
        } else if (stats?.hasErrors()) {
          console.error(
            `[Server] ❌ Compilation errors:`,
            stats.toJson({ errors: true }).errors,
          );
          reject(new Error("Compilation errors"));
        } else {
          console.log(`[Server] ✅ Compiled server functions successfully.`);
          resolve();
        }
      });
    });
  }

  private makeNodeFederationPlugin() {
    const funcs = discoverServerFunctions();
    const actions = discoverAppSkillActions();
    return new ModuleFederationPlugin({
      name: this.pulseConfig.id + "_server",
      remoteType: "script",
      library: { type: "commonjs-module" },
      filename: "remoteEntry.js",
      exposes: {
        ...funcs,
        ...actions,
      },
    });
  }

  private printChanges(compiler: Compiler) {
    const modified = compiler.modifiedFiles
      ? Array.from(compiler.modifiedFiles)
      : [];

    const removed = compiler.removedFiles
      ? Array.from(compiler.removedFiles)
      : [];

    const allChanges = [...modified, ...removed];

    if (allChanges.length > 0) {
      console.log(
        `[Server] ✏️ Detected file changes:\n${allChanges
          .map((file) => `  - ${file}`)
          .join("\n")}`,
      );
    }
  }
}

export async function makeMFServerConfig(
  mode: "development" | "production",
): Promise<RspackOptions> {
  const projectDirName = process.cwd();
  const pulseConfig = await loadPulseConfig();

  return {
    mode: mode,
    name: "server",
    entry: {},
    target: "async-node",
    output: {
      publicPath: `./${pulseConfig.id}/${pulseConfig.version}/server/`, 
      path: path.resolve(projectDirName, "dist/server"),
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
    plugins: [new MFServerPlugin(pulseConfig)],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "builtin:swc-loader",
            options: {
              jsc: {
                parser: {
                  syntax: "typescript",
                  tsx: true,
                },
              },
            },
          },
          exclude: [/node_modules/, /dist/],
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
