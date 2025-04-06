// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  target: "es2020",
  external: [
    "webpack",
    "terser-webpack-plugin",
    "uglify-js",
    "@swc/core"
  ],
  splitting: false,
  sourcemap: true,

  esbuildOptions(options) {
    options.resolveExtensions = ['.ts', '.js', '.json']; 
  },



});
