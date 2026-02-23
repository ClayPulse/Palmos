/* eslint-disable @typescript-eslint/no-explicit-any */
import mfNode from "@module-federation/node";
import fs from "fs";
import { globSync } from "glob";
import path from "path";
import wp, { Compiler, Configuration as WebpackConfig } from "webpack";
import { loadPulseConfig } from "./utils.js";

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

      // Before build starts
      compiler.hooks.watchRun.tap("ReloadMessagePlugin", () => {
        if (!isFirstRun) {
          console.log(`[Server] 🔄 Reloading app...`);
        } else {
          console.log(`[Server] 🔄 Building app...`);
        }

        this.compileServerFunctions(compiler);
      });

      // After build finishes
      compiler.hooks.done.tap("ReloadMessagePlugin", () => {
        if (isFirstRun) {
          console.log(`[Server] ✅ Successfully built server.`);
          isFirstRun = false;
        } else {
          console.log(`[Server] ✅ Reload finished.`);
        }
      });

      // Watch for changes in the server-function directory to trigger rebuilds
      compiler.hooks.thisCompilation.tap(
        "WatchServerFunctions",
        (compilation) => {
          compilation.contextDependencies.add(
            path.resolve(this.projectDirName, "src/server-function"),
          );
        },
      );
    } else {
      // Print build success/failed message
      compiler.hooks.done.tap("BuildMessagePlugin", (stats) => {
        if (stats.hasErrors()) {
          console.log(`[Server] ❌ Failed to build server.`);
        } else {
          this.compileServerFunctions(compiler);
          console.log(`[Server] ✅ Successfully built server.`);
        }
      });
    }
  }

  /**
   * Programmatically call webpack to compile server functions
   * whenever there are changes in the src/server-function directory.
   * This is necessary because Module Federation needs to know about
   * all the exposed modules at build time, so we have to trigger a
   * new compilation whenever server functions are added/removed/changed.
   * @param compiler
   */
  private compileServerFunctions(compiler: Compiler) {
    // Remove existing entry points
    try {
      fs.rmSync("dist/server", { recursive: true, force: true });
    } catch (e) {
      console.error("Error removing dist/server:", e);
      console.log("Continuing...");
    }

    // Generate tsconfig for server functions
    function generateTempTsConfig() {
      const tempTsConfigPath = path.join(
        process.cwd(),
        "node_modules/.pulse/tsconfig.server.json",
      );

      const tsConfig = {
        compilerOptions: {
          target: "ES2020",
          module: "esnext",
          moduleResolution: "bundler",
          strict: true,
          declaration: true,
          outDir: path.join(process.cwd(), "dist"),
        },
        include: [
          path.join(process.cwd(), "src/server-function/**/*"),
          path.join(process.cwd(), "pulse.config.ts"),
          path.join(process.cwd(), "global.d.ts"),
        ],
        exclude: [
          path.join(process.cwd(), "node_modules"),
          path.join(process.cwd(), "dist"),
        ],
      };

      fs.writeFileSync(tempTsConfigPath, JSON.stringify(tsConfig, null, 2));
    }

    generateTempTsConfig();

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
    newCompiler?.run((err, stats) => {
      if (err) {
        console.error(`[Server] ❌ Error during recompilation:`, err);
      } else if (stats?.hasErrors()) {
        console.error(`[Server] ❌ Compilation errors:`, stats.toJson().errors);
      } else {
        console.log(`[Server] ✅ Compiled server functions successfully.`);
      }
    });
  }

  private makeNodeFederationPlugin() {
    function discoverServerFunctions() {
      // Get all .ts files under src/server-function and read use default exports as entry points
      const files = globSync("./src/server-function/**/*.ts");
      const entryPoints = files
        .map((file) => file.replaceAll("\\", "/"))
        .map((file) => {
          return {
            ["./" +
            file.replace("src/server-function/", "").replace(/\.ts$/, "")]:
              "./" + file,
          };
        })
        .reduce((acc, curr) => {
          return { ...acc, ...curr };
        }, {});

      return entryPoints;
    }

    const funcs = discoverServerFunctions();

    console.log(`Discovered server functions:
${Object.entries(funcs)
  .map(([name, file]) => {
    return `  - ${name.slice(2)} (from ${file})`;
  })
  .join("\n")}
`);

    return new NodeFederationPlugin(
      {
        name: this.pulseConfig.id + "_server",
        remoteType: "script",
        useRuntimePlugin: true,
        library: { type: "commonjs-module" },
        filename: "remoteEntry.js",
        exposes: {
          ...funcs,
        },
      } as any,
      {},
    );
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
