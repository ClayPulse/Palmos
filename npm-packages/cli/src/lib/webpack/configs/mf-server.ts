/* eslint-disable @typescript-eslint/no-explicit-any */
import mfNode from "@module-federation/node";
import fs from "fs";
import path from "path";
import wp, { Compiler, Configuration as WebpackConfig } from "webpack";
import {
  compileAppActionSkills,
  discoverAppSkillActions,
  discoverServerFunctions,
  loadPulseConfig,
} from "./utils.js";

const { NodeFederationPlugin } = mfNode;
const { webpack } = wp;

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
      compiler.hooks.watchRun.tap("ReloadMessagePlugin", async (compiler) => {
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
      compiler.hooks.done.tap("BuildMessagePlugin", async (stats) => {
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
   * Programmatically call webpack to compile server functions
   * whenever there are changes in the src/server-function directory.
   * This is necessary because Module Federation needs to know about
   * all the exposed modules at build time, so we have to trigger a
   * new compilation whenever server functions are added/removed/changed.
   * @param compiler
   */
  private async compileServerFunctions(compiler: Compiler) {
    // Run a new webpack compilation to pick up new server functions
    const options: any = {
      ...compiler.options,
      watch: false,
      plugins: [
        // Add a new NodeFederationPlugin with updated entry points
        this.makeNodeFederationPlugin(),
      ],
    };
    const newCompiler = webpack(options);

    // Run the new compiler
    return new Promise<void>((resolve, reject) => {
      newCompiler?.run((err, stats) => {
        if (err) {
          console.error(`[Server] ❌ Error during recompilation:`, err);
          reject(err);
        } else if (stats?.hasErrors()) {
          console.error(
            `[Server] ❌ Compilation errors:`,
            stats.toJson().errors,
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
    return new NodeFederationPlugin(
      {
        name: this.pulseConfig.id + "_server",
        remoteType: "script",
        useRuntimePlugin: true,
        library: { type: "commonjs-module" },
        filename: "remoteEntry.js",
        exposes: {
          ...funcs,
          ...actions,
        },
      } as any,
      {},
    );
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
): Promise<WebpackConfig> {
  const projectDirName = process.cwd();
  const pulseConfig = await loadPulseConfig();

  return {
    mode: mode,
    name: "server",
    entry: {},
    target: "async-node",
    output: {
      publicPath: "auto",
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
            loader: "ts-loader",
            options: {
              configFile: "node_modules/.pulse/tsconfig.server.json",
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
