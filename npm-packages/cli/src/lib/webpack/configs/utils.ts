/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, writeFileSync } from "fs";
import fs from "fs/promises";
import { globSync } from "glob";
import { networkInterfaces } from "os";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";
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
  return mod.default;
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

      return {
        ["./skill/" + funcDecl.getName()]: "./" + file,
      };
    })
    .reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});

  return entryPoints;
}

// Generate tsconfig for server functions
export function generateTempTsConfig() {
  const tempTsConfigPath = path.join(
    process.cwd(),
    "node_modules/.pulse/tsconfig.server.json",
  );

  if (existsSync(tempTsConfigPath)) {
    return;
  }

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
