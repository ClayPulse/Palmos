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
import {
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
            this.compileAppActionSkills();
          }
        } else {
          console.log(`[Server] 🔄 Building app...`);
          await this.compileServerFunctions(compiler);
          this.compileAppActionSkills();
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
      compiler.hooks.done.tap("BuildMessagePlugin", async (stats) => {
        if (stats.hasErrors()) {
          console.log(`[Server] ❌ Failed to build server.`);
        } else {
          try {
            await this.compileServerFunctions(compiler);
            this.compileAppActionSkills();
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

  /**
   * Register default functions defined in src/skill as exposed modules in Module Federation.
   * This will:
   * 	1. Search for all .ts files under src/skill
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

        // Get action name from path `src/skill/{actionName}/action.ts`
        // Match `*/src/skill/{actionName}/action.ts` and extract {actionName}
        const pattern = /src\/skill\/([^\/]+)\/action\.ts$/;
        const match = file.replaceAll("\\", "/").match(pattern);
        if (!match) {
          console.warn(
            `File path ${file} does not match pattern ${pattern}. Skipping...`,
          );
          return;
        }
        const actionName = match[1];
        if (!actionName) {
          console.warn(
            `Could not extract action name from file path ${file}. Skipping...`,
          );
          return;
        }

        // Throw an error if the funcName is duplicated with an existing action to prevent accidental overwriting
        if (actions.some((action) => action.name === actionName)) {
          throw new Error(
            `Duplicate action name "${actionName}" detected in file ${file}. Please ensure all actions have unique names to avoid conflicts.`,
          );
        }

        const defaultExportJSDocs = funcDecl.getJsDocs();

        // Validate that the function has a JSDoc description
        const descriptionText = defaultExportJSDocs
          .map((doc) => doc.getDescription().replace(/^\*+/gm, "").trim())
          .join("\n")
          .trim();

        if (defaultExportJSDocs.length === 0 || !descriptionText) {
          throw new Error(
            `[Action Validation] Action "${actionName}" in ${file} is missing a JSDoc description. ` +
              `Please add a JSDoc comment block with a description above the function.` +
              `Run \`pulse skill fix ${actionName}\` to automatically add a JSDoc template for this action.`,
          );
        }

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

          const paramProperties = funcParam.getType().getProperties();
          const inputTypeDef = typeDefs["input"] ?? {};

          if (paramProperties.length > 0 && !typeDefs["input"]) {
            throw new Error(
              `[Action Validation] Action "${actionName}" in ${file} has parameters but is missing an ` +
                `"@typedef {Object} input" JSDoc block. Please document all parameters with ` +
                `@typedef {Object} input and @property tags.` +
                `Run \`pulse skill fix ${actionName}\` to automatically add a JSDoc template for this action.`,
            );
          }

          paramProperties.forEach((prop) => {
            const name = prop.getName();

            if (!inputTypeDef[name]) {
              throw new Error(
                `[Action Validation] Action "${actionName}" in ${file}: parameter "${name}" is missing ` +
                  `a @property entry in the "input" JSDoc typedef. Please add ` +
                  `"@property {type} ${name} - description" to the JSDoc.` +
                  `Run \`pulse skill fix ${actionName}\` to automatically add a JSDoc template for this action.`,
              );
            }

            if (!inputTypeDef[name]?.description?.trim()) {
              throw new Error(
                `[Action Validation] Action "${actionName}" in ${file}: parameter "${name}" has an empty ` +
                  `description in the JSDoc @property. Please provide a meaningful description.` +
                  `Run \`pulse skill fix ${actionName}\` to automatically add a JSDoc template for this action.`,
              );
            }

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
        const rawReturnType = funcDecl.getReturnType();
        const isPromiseLikeReturn = this.isPromiseLikeType(rawReturnType);
        const returnType = this.unwrapPromiseLikeType(rawReturnType);

        // Check if the return type is an object
        if (!returnType.isObject()) {
          console.warn(
            `[Action Registration] Function ${actionName}'s return type should be an object. Skipping...`,
          );
          return;
        }

        const returns: Record<string, TypedVariable> = {};
        const returnProperties = returnType.getProperties();
        const outputTypeDef = typeDefs["output"] ?? {};
        const hasOutputTypeDef = !!typeDefs["output"];

        if (
          returnProperties.length > 0 &&
          !hasOutputTypeDef &&
          !isPromiseLikeReturn
        ) {
          throw new Error(
            `[Action Validation] Action "${actionName}" in ${file} returns properties but is missing an ` +
              `"@typedef {Output}" JSDoc block. Please document all return values with ` +
              `@typedef {Output} and @property tags.` +
              `Run \`pulse skill fix ${actionName}\` to automatically add a JSDoc template for this action.`,
          );
        }

        if (returnProperties.length > 0 && !hasOutputTypeDef && isPromiseLikeReturn) {
          console.warn(
            `[Action Validation] Action "${actionName}" in ${file} is missing an "@typedef {Object} output" JSDoc block. ` +
              `Falling back to TypeScript-inferred return metadata because the action returns a Promise.`,
          );
        }

        returnProperties.forEach((prop) => {
          const name = prop.getName();

          if (!hasOutputTypeDef) {
            const variable: TypedVariable = {
              description: "",
              type: this.getType(prop.getTypeAtLocation(funcDecl).getText()),
              optional: prop.isOptional() ? true : undefined,
              defaultValue: undefined,
            };
            returns[name] = variable;
            return;
          }

          if (!outputTypeDef[name]) {
            throw new Error(
              `[Action Validation] Action "${actionName}" in ${file}: return property "${name}" is missing ` +
                `a @property entry in the "output" JSDoc typedef. Please add ` +
                `"@property {type} ${name} - description" to the JSDoc.` +
                `Run \`pulse skill fix ${actionName}\` to automatically add a JSDoc template for this action.`,
            );
          }

          if (!outputTypeDef[name]?.description?.trim()) {
            throw new Error(
              `[Action Validation] Action "${actionName}" in ${file}: return property "${name}" has an empty ` +
                `description in the JSDoc @property. Please provide a meaningful description.` +
                `Run \`pulse skill fix ${actionName}\` to automatically add a JSDoc template for this action.`,
            );
          }

          const variable: TypedVariable = {
            description: outputTypeDef[name]?.description ?? "",
            type: this.getType(outputTypeDef[name]?.type ?? ""),
            optional: prop.isOptional() ? true : undefined,
            defaultValue: undefined,
          };
          returns[name] = variable;
        });

        actions.push({
          name: actionName,
          description,
          parameters: params,
          returns,
        });
      });
    });

    // You can now register `actions` in Module Federation or expose them as needed
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
          const propName = this.normalizeJSDocPropertyName(propertyMatches[2]);
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

  private normalizeJSDocPropertyName(name: string | undefined) {
    if (!name) return "";

    return name
      .trim()
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split("=")[0]
      ?.trim();
  }

  private isPromiseLikeType(type: import("ts-morph").Type) {
    const symbolName = type.getSymbol()?.getName();
    return symbolName === "Promise" || symbolName === "PromiseLike";
  }

  private unwrapPromiseLikeType(type: import("ts-morph").Type) {
    const symbolName = type.getSymbol()?.getName();
    if (
      (symbolName === "Promise" || symbolName === "PromiseLike") &&
      type.getTypeArguments().length > 0
    ) {
      return type.getTypeArguments()[0] ?? type;
    }

    return type;
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
