/* eslint-disable @typescript-eslint/no-explicit-any */
import mfNode from "@module-federation/node";
import type {
  Action,
  TypedVariable,
  TypedVariableType,
} from "@pulse-editor/shared-utils/dist/types/types.js";
import fs from "fs";
import { globSync } from "glob";
import path from "path";
import { JSDoc, Node, Project, SyntaxKind } from "ts-morph";
import wp, { Compiler, Configuration as WebpackConfig } from "webpack";
import { discoverAppSkillActions, loadPulseConfig } from "./utils.js";

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
      compiler.hooks.watchRun.tap(
        "ReloadMessagePlugin",
        async (compilation) => {
          this.cleanServerDist();

          if (!isFirstRun) {
            console.log(`[Server] 🔄 Reloading app...`);
            const isServerFunctionChange = compilation.modifiedFiles
              ? Array.from(compilation.modifiedFiles).some((file) =>
                  file.includes("src/server-function"),
                )
              : false;

            if (isServerFunctionChange) {
              await this.compileServerFunctions(compiler);
            }

            const isActionChange = compilation.modifiedFiles
              ? Array.from(compilation.modifiedFiles).some((file) =>
                  file.includes("src/action"),
                )
              : false;

            if (isActionChange) {
              console.log(
                `[Server] Detected changes in actions. Recompiling...`,
              );
              this.compileAppActionSkills();
            }
          } else {
            console.log(`[Server] 🔄 Building app...`);
            await this.compileServerFunctions(compiler);
            this.compileAppActionSkills();
            console.log(`[Server] ✅ Successfully built server.`);
          }
        },
      );

      // After build finishes
      compiler.hooks.done.tap("ReloadMessagePlugin", () => {
        if (isFirstRun) {
          isFirstRun = false;
        } else {
          console.log(`[Server] ✅ Reload finished.`);
        }
      });

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
          path.resolve(this.projectDirName, "src/action"),
        );
      });
    } else {
      // Print build success/failed message
      compiler.hooks.done.tap("BuildMessagePlugin", async (stats) => {
        if (stats.hasErrors()) {
          console.log(`[Server] ❌ Failed to build server.`);
        } else {
          try {
            await this.compileServerFunctions(compiler);
            this.compileAppActionSkills();
          } catch (err) {
            console.log(`[Server] ❌ Error during compilation:`, err);
            return;
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
    const actions = discoverAppSkillActions();

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
          ...actions,
        },
      } as any,
      {},
    );
  }

  /**
   * Register default functions defined in src/action as exposed modules in Module Federation.
   * This will:
   * 	1. Search for all .ts files under src/action
   *  2. Use ts-morph to get the default function information, including function name, parameters, and JSDoc comments
   *  3. Organize the functions' information into a list of Action
   * @param compiler
   */
  private compileAppActionSkills() {
    // 1. Get all TypeScript files under src/skill
    const files = globSync("./src/skill/*/action.ts");

    const project = new Project({
      tsConfigFilePath: path.join(
        process.cwd(),
        "node_modules/.pulse/tsconfig.server.json",
      ),
    });

    const actions: Action[] = [];

    files.forEach((file) => {
      const sourceFile = project.addSourceFileAtPath(file);
      const defaultExportSymbol = sourceFile.getDefaultExportSymbol();
      if (!defaultExportSymbol) return;
      const defaultExportDeclarations = defaultExportSymbol.getDeclarations();
      defaultExportDeclarations.forEach((declaration) => {
        if (declaration.getKind() !== SyntaxKind.FunctionDeclaration) return;
        const funcDecl = declaration.asKindOrThrow(
          SyntaxKind.FunctionDeclaration,
        );

        // Extract JSDoc comments
        const funcName = funcDecl.getName() ?? "default";

        // Throw an error if the funcName is duplicated with an existing action to prevent accidental overwriting
        if (actions.some((action) => action.name === funcName)) {
          throw new Error(
            `Duplicate action name "${funcName}" detected in file ${file}. Please ensure all actions have unique names to avoid conflicts.`,
          );
        }

        const defaultExportJSDocs = funcDecl.getJsDocs();
        const description = defaultExportJSDocs
          .map((doc) => doc.getFullText())
          .join("\n");

        const allJSDocs = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
        const typeDefs = this.parseTypeDefs(allJSDocs);

        /* Extract parameter descriptions from JSDoc */

        const funcParam = funcDecl.getParameters()[0];
        const params: Record<string, TypedVariable> = {};
        if (funcParam) {
          /**
           * Extract default values from the destructured parameter
           * (ObjectBindingPattern → BindingElement initializer)
           */
          const defaults = new Map<string, string>();

          const nameNode = funcParam.getNameNode();
          if (Node.isObjectBindingPattern(nameNode)) {
            nameNode.getElements().forEach((el) => {
              if (!Node.isBindingElement(el)) return;

              const name = el.getName();
              const initializer = el.getInitializer()?.getText();

              if (initializer) {
                defaults.set(name, initializer);
              }
            });
          }

          funcParam
            .getType()
            .getProperties()
            .forEach((prop) => {
              const name = prop.getName();
              const inputTypeDef = typeDefs["input"] ?? {};

              const variable: TypedVariable = {
                description: inputTypeDef[name]?.description ?? "",
                type: this.getType(inputTypeDef[name]?.type ?? ""),
                optional: prop.isOptional() ? true : undefined,
                defaultValue: defaults.get(name),
              };

              params[name] = variable;
            });
        }

        /* Extract return type from JSDoc */
        // Check if the return type is an object
        if (!funcDecl.getReturnType().isObject()) {
          console.warn(
            `[Action Registration] Function ${funcName}'s return type should be an object. Skipping...`,
          );
          return;
        }

        const returns: Record<string, TypedVariable> = {};
        funcDecl
          .getReturnType()
          .getProperties()
          .forEach((prop) => {
            const name = prop.getName();
            const outputTypeDef = typeDefs["output"] ?? {};

            const variable: TypedVariable = {
              description: outputTypeDef[name]?.description ?? "",
              type: this.getType(outputTypeDef[name]?.type ?? ""),
              optional: prop.isOptional() ? true : undefined,
              defaultValue: undefined,
            };
            returns[name] = variable;
          });

        actions.push({
          name: funcName,
          description,
          parameters: params,
          returns,
        });
      });
    });

    // You can now register `actions` in Module Federation or expose them as needed
    console.log(
      "Discovered skill actions:\n" +
        actions.map((a) => "- " + a.name).join("\n"),
    );

    // Register actions in pulse config for runtime access
    this.pulseConfig.actions = actions;
  }

  private parseTypeDefs(jsDocs: JSDoc[]) {
    const typeDefs: Record<
      string,
      Record<string, { type: string; description: string }>
    > = {};

    // Match @typedef {Type} Name
    const typedefRegex = /@typedef\s+{([^}]+)}\s+([^\s-]+)/g;

    // Match @property {Type} [name] Description text...
    const propertyRegex =
      /@property\s+{([^}]+)}\s+(\[?[^\]\s]+\]?)\s*-?\s*(.*)/g;

    jsDocs.forEach((doc) => {
      const text = doc.getFullText();

      let typedefMatches;
      while ((typedefMatches = typedefRegex.exec(text)) !== null) {
        const typeName = typedefMatches[2];
        if (!typeName) continue;

        const properties: Record<
          string,
          { type: string; description: string }
        > = {};
        let propertyMatches;
        while ((propertyMatches = propertyRegex.exec(text)) !== null) {
          const propName = propertyMatches[2];
          const propType = propertyMatches[1];
          const propDescription = propertyMatches[3] || "";
          if (propName && propType) {
            properties[propName] = {
              type: propType,
              description: propDescription.trim(),
            };
          }
        }

        typeDefs[typeName.toLowerCase()] = properties;
      }
    });

    return typeDefs;
  }

  private getType(text: string): TypedVariableType {
    if (text === "string") return "string";
    if (text === "number") return "number";
    if (text === "boolean") return "boolean";
    if (text === "any") return "object";
    if (text.endsWith("[]")) return [this.getType(text.slice(0, -2))];
    if (text.length === 0) return "undefined";

    console.warn(
      `[Type Warning] Unrecognized type "${text}". Consider adding explicit types in your action's JSDoc comments for better type safety and documentation.`,
    );
    return text;
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
