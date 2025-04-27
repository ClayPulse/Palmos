import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

// rollup.config.mjs
export default {
  input: "src/main.ts",
  output: [
    {
      dir: "dist",
      format: "es",
      exports: "named",
      // For some reason, without this, the output misses
      // some exports necessary for shared types/utils to work.
      // (Nextjs won't work but @pulse-editor/react-api works?)
      // This might have something to do with the way Rollup
      // tree-shakes the code, or the d.ts files are not properly
      // linked by importing apps.
      preserveModules: true,
    }
  ],
  plugins: [
    resolve({
      extensions: [".js", ".ts"],
    }),
    babel({
      babelHelpers: "bundled",
      exclude: ["node_modules/**"],
    }),
    typescript({
      declaration: true,
      declarationDir: "dist",
      rootDir: "src",
      exclude: ["node_modules/**"],
    }),
    terser(),
  ],
};
