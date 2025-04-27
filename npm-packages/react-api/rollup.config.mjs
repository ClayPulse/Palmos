import resolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

// rollup.config.mjs
export default {
  input: "src/main.ts",
  output: [
    {
      file: "dist/main.js",
      format: "es",
      exports: "named",
    },
  ],
  plugins: [
    resolve({
      extensions: [".js", ".ts", ".tsx", ".jsx"],
    }),
    peerDepsExternal(),
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
    terser(),
  ],
};
