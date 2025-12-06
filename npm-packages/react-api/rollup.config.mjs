import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

// rollup.config.mjs
export default {
  input: "src/main.ts",
  output: [
    {
      file: "dist/main.js",
      format: "es",
      exports: "named",
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      extensions: [".js", ".ts", ".tsx", ".jsx"],
    }),
    babel({
      babelHelpers: "bundled",
      exclude: ["node_modules/**"],
    }),
    typescript({
      declaration: true,
      outDir: "dist",
      rootDir: "src",
      exclude: ["node_modules/**"],
    }),
  ],
};
