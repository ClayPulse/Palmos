import type { ForgeConfig } from "@electron-forge/shared-types";
import path from "path";
import fs from "fs-extra";

function moveModule(moduleList: string[], resourcePath: string) {
  moduleList.forEach((module) => {
    fs.moveSync(
      path.join("./node_modules", module),
      path.join(resourcePath, "app/node_modules", module)
    );
  });
}

const electronModules = ["electron-serve"];

const config: ForgeConfig = {
  outDir: "../build/desktop",
  packagerConfig: {
    name: "Pulse Editor",
    icon: path.join(__dirname, "../shared-assets/icons/electron/pulse_editor"),
    // Copy the electron modules and the nextjs build to the electron build.
    extraResource: electronModules
      .map((module) => `./node_modules/${module}`)
      .concat("../build/next"),
    afterComplete: [
      (extractPath, electronVersion, platform, arch, done) => {
        // We need electron-serve to exist inside the electron build's node_modules.
        // All other modules from nextjs are not needed and can be removed.
        if (platform === "win32") {
          moveModule(electronModules, path.join(extractPath, "resources"));
        } else if (platform === "darwin") {
          moveModule(
            electronModules,
            path.join(extractPath, "pulse-editor.app/Contents/Resources")
          );
        } else if (platform === "linux") {
        }

        done();
      },
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: path.join(
            __dirname,
            "../shared-assets/icons/electron/pulse_logo_round"
          ),
        },
      },
    },
  ],
};

export default config;
