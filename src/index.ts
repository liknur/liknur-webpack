// Very important !!!! ts-loader will not work without importing this as .js file
// even if in reality it is a .ts file this is caused by the fact that ts-node/esm is used
// see package.json scripts for more info

export * from "./parse-config.js";
export * from "./webpack-config.js";
export * from "./types/lib.js";
export { getAliases } from "./extracts.js";
export type { LiknurConfig } from "./schema-config.js";
