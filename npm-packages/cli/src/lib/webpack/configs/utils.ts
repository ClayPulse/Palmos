/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Action,
  TypedVariable,
  TypedVariableType,
} from "@pulse-editor/shared-utils/dist/types/types.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import fs from "fs/promises";
import { globSync } from "glob";
import { networkInterfaces } from "os";
import path from "path";
import { JSDoc, Node, Project, SyntaxKind } from "ts-morph";
import ts from "typescript";
import { pathToFileURL } from "url";

export async function loadPulseConfig() {
  const projectDirName = process.cwd();

  // compile to js file and import
  const program = ts.createProgram({
    rootNames: [path.join(projectDirName, "pulse.config.ts")],
    options: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      outDir: path.join(projectDirName, "node_modules/.pulse/config"),
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
  });
  program.emit();

  // Fix imports in the generated js file for all files in node_modules/.pulse/config
  globSync("node_modules/.pulse/config/**/*.js", {
    cwd: projectDirName,
    absolute: true,
  }).forEach(async (jsFile) => {
    let content = await fs.readFile(jsFile, "utf-8");
    content = content.replace(
      /(from\s+["']\.\/[^\s"']+)(["'])/g,
      (match, p1, p2) => {
        // No change if the import already has any extension
        if (p1.match(/\.(js|cjs|mjs|ts|tsx|json)$/)) {
          return match; // No change needed
        }

        return `${p1}.js${p2}`;
      },
    );
    await fs.writeFile(jsFile, content);
  });

  // Copy package.json if exists
  const pkgPath = path.join(projectDirName, "package.json");

  if (existsSync(pkgPath)) {
    const destPath = path.join(
      projectDirName,
      "node_modules/.pulse/config/package.json",
    );
    await fs.copyFile(pkgPath, destPath);
  }

  const compiledConfig = path.join(
    projectDirName,
    "node_modules/.pulse/config/pulse.config.js",
  );
  const mod = await import(pathToFileURL(compiledConfig).href);
  // delete the compiled config after importing
  await fs.rm(path.join(projectDirName, "node_modules/.pulse/config"), {
    recursive: true,
    force: true,
  });

  const config = mod.default;

  // Always use the version from package.json as the source of truth
  const pkgJsonPath = path.join(projectDirName, "package.json");
  if (existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"));
    if (pkg.version) {
      config.version = pkg.version;
    }
  }

  return config;
}

export function getLocalNetworkIP() {
  const interfaces = networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const config of iface) {
      if (config.family === "IPv4" && !config.internal) {
        return config.address; // Returns the first non-internal IPv4 address
      }
    }
  }
  return "localhost"; // Fallback
}

export async function readConfigFile() {
  // Read pulse.config.json from dist/client
  // Wait until dist/pulse.config.json exists
  while (true) {
    try {
      await fs.access("dist/pulse.config.json");
      break;
    } catch (err) {
      // Wait for 100ms before trying again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const data = await fs.readFile("dist/pulse.config.json", "utf-8");
  return JSON.parse(data);
}

export function discoverServerFunctions() {
  // Get all .ts files under src/server-function and read use default exports as entry points
  const files = globSync("./src/server-function/**/*.ts");
  const entryPoints = files
    .map((file) => file.replaceAll("\\", "/"))
    .map((file) => {
      return {
        ["./" + file.replace("src/server-function/", "").replace(/\.ts$/, "")]:
          "./" + file,
      };
    })
    .reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});

  return entryPoints;
}

export function discoverAppSkillActions() {
  // Get all .ts files under src/skill and read use default exports as entry points
  const files = globSync("./src/skill/*/action.ts");
  const entryPoints = files
    .map((file) => file.replaceAll("\\", "/"))
    .map((file) => {
      // Read default export info in the file using ts-morph to get the function name, and use the function name as the entry point key instead of the file name
      const project = new Project({
        tsConfigFilePath: path.join(
          process.cwd(),
          "node_modules/.pulse/tsconfig.server.json",
        ),
      });

      const sourceFile = project.addSourceFileAtPath(file);
      const defaultExportSymbol = sourceFile.getDefaultExportSymbol();
      if (!defaultExportSymbol) {
        console.warn(
          `No default export found in action file ${file}. Skipping...`,
        );
        return null;
      }

      const defaultExportDeclarations = defaultExportSymbol.getDeclarations();
      if (defaultExportDeclarations.length === 0) {
        console.warn(
          `No declarations found for default export in action file ${file}. Skipping...`,
        );
        return null;
      }

      const funcDecl = defaultExportDeclarations[0]?.asKind(
        SyntaxKind.FunctionDeclaration,
      );
      if (!funcDecl) {
        console.warn(
          `Default export in action file ${file} is not a function declaration. Skipping...`,
        );
        return null;
      }

      // Match `*/src/skill/{actionName}/action.ts` and extract {actionName}
      const pattern = /src\/skill\/([^\/]+)\/action\.ts$/;
      const match = file.replaceAll("\\", "/").match(pattern);
      if (!match) {
        console.warn(
          `File path ${file} does not match pattern ${pattern}. Skipping...`,
        );
        return null;
      }
      const actionName = match[1];
      if (!actionName) {
        console.warn(
          `Could not extract action name from file path ${file}. Skipping...`,
        );
        return null;
      }

      return {
        ["./skill/" + actionName]: "./" + file,
      };
    })
    .filter((entry) => entry !== null)
    .reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});

  return entryPoints;
}

export function parseTypeDefs(jsDocs: JSDoc[]) {
  const typeDefs: Record<
    string,
    Record<string, { type: string; description: string }>
  > = {};

  const typedefRegex = /@typedef\s+{([^}]+)}\s+([^\s-]+)/g;
  const propertyRegex = /@property\s+{([^}]+)}\s+(\[?[^\]\s]+\]?)\s*-?\s*(.*)/g;

  jsDocs.forEach((doc) => {
    const text = doc.getFullText();

    let typedefMatches;
    while ((typedefMatches = typedefRegex.exec(text)) !== null) {
      const typeName = typedefMatches[2];
      if (!typeName) continue;

      const properties: Record<string, { type: string; description: string }> =
        {};
      let propertyMatches;
      while ((propertyMatches = propertyRegex.exec(text)) !== null) {
        const propName = normalizeJSDocPropertyName(propertyMatches[2]);
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

export function normalizeJSDocPropertyName(name: string | undefined) {
  if (!name) return "";
  return name
    .trim()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split("=")[0]
    ?.trim();
}

export function isPromiseLikeType(type: import("ts-morph").Type) {
  const symbolName = type.getSymbol()?.getName();
  return symbolName === "Promise" || symbolName === "PromiseLike";
}

export function unwrapPromiseLikeType(type: import("ts-morph").Type) {
  const symbolName = type.getSymbol()?.getName();
  if (
    (symbolName === "Promise" || symbolName === "PromiseLike") &&
    type.getTypeArguments().length > 0
  ) {
    return type.getTypeArguments()[0] ?? type;
  }
  return type;
}

export function getActionType(text: string): TypedVariableType {
  if (text === "string") return "string";
  if (text === "number") return "number";
  if (text === "boolean") return "boolean";
  if (text === "any") return "object";
  if (text.endsWith("[]")) return [getActionType(text.slice(0, -2))];
  if (text.length === 0) return "undefined";
  console.warn(
    `[Type Warning] Unrecognized type "${text}". Consider adding explicit types in your action's JSDoc comments for better type safety and documentation.`,
  );
  return text;
}

export function compileAppActionSkills(pulseConfig: any) {
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

      if (actions.some((action) => action.name === actionName)) {
        throw new Error(
          `Duplicate action name "${actionName}" detected in file ${file}. Please ensure all actions have unique names to avoid conflicts.`,
        );
      }

      const defaultExportJSDocs = funcDecl.getJsDocs();

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
      const typeDefs = parseTypeDefs(allJSDocs);

      const funcParam = funcDecl.getParameters()[0];
      const params: Record<string, TypedVariable> = {};
      if (funcParam) {
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
            type: getActionType(inputTypeDef[name]?.type ?? ""),
            optional: prop.isOptional() ? true : undefined,
            defaultValue: defaults.get(name),
          };

          params[name] = variable;
        });
      }

      /* Extract return type from JSDoc */
      const rawReturnType = funcDecl.getReturnType();
      const isPromiseLikeReturn = isPromiseLikeType(rawReturnType);
      const returnType = unwrapPromiseLikeType(rawReturnType);

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

      if (
        returnProperties.length > 0 &&
        !hasOutputTypeDef &&
        isPromiseLikeReturn
      ) {
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
            type: getActionType(prop.getTypeAtLocation(funcDecl).getText()),
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
          type: getActionType(outputTypeDef[name]?.type ?? ""),
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

  pulseConfig.actions = actions;

  return pulseConfig;
}

// Generate tsconfig for server functions
export function generateTempTsConfig() {
  const tempTsConfigDir = path.join(process.cwd(), "node_modules/.pulse");
  const tempTsConfigPath = path.join(tempTsConfigDir, "tsconfig.server.json");

  // Always regenerate: the previous implementation skipped regeneration when
  // the file existed, but the tsconfig bakes in absolute paths derived from
  // process.cwd(). If the project is moved/renamed (or was generated from a
  // different parent dir) the stale cache causes ts-loader TS18003 errors.
  // Ensure the parent directory exists so we don't ENOENT on fresh installs
  // or when `.pulse` has been wiped.
  mkdirSync(tempTsConfigDir, { recursive: true });

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

  writeFileSync(tempTsConfigPath, JSON.stringify(tsConfig, null, 2));
}
