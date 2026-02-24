/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync } from "fs";
import fs from "fs/promises";
import { globSync } from "glob";
import { networkInterfaces } from "os";
import path from "path";
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
