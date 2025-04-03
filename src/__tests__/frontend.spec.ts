import { describe, expect, it } from "@jest/globals";
import webpack, { Configuration } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";

jest.spyOn(console, "log").mockImplementation(() => {});
jest.mock("chalk", () => ({
  red: (text: string): string => text,
  bold: (text: string): string => text,
  green: (text: string): string => text,
}));

import createFrontendConfig, { FrontendOptions } from "@/frontend";

function getDefinitions(
  plugins: Configuration["plugins"],
): Record<string, string | boolean> | null {
  if (plugins === undefined || plugins.length === 0 || plugins[0] == null) {
    return null;
  }

  const plugin = plugins?.[1];
  if (!(plugin instanceof webpack.DefinePlugin)) {
    return null;
  }

  const definitions = plugin.definitions;

  if (plugin instanceof webpack.DefinePlugin) {
    let retval: Record<string, string | boolean> = {};
    for (const key in definitions) {
      if (typeof definitions[key] === "string") {
        retval[key] = definitions[key];
      } else if (typeof definitions[key] === "boolean") {
        retval[key] = definitions[key];
      } else {
        throw new Error("Invalid type");
      }
    }
    return retval;
  }
  return null;
}

describe("Creataing backend webpack configuration", () => {
  let defaultConfig: FrontendOptions;
  beforeEach(() => {
    defaultConfig = {
      name: "Project",
      buildType: "development",
      aliases: {
        "@common": "src/common",
      },
      entry: "./src/index.ts",
      output: "dist",
    } satisfies FrontendOptions;
  });

  it("Given a valid frontend options, it should return webpack configuration", () => {
    const result = createFrontendConfig(defaultConfig);

    expect(result).toBeDefined();
  });

  it("Given a frontend options in development mode, it should return a development configuration", () => {
    const result = createFrontendConfig(defaultConfig);

    expect(result.mode).toBe("development");
  });

  it("Given a frontend options in production mode, it should return a production configuration", () => {
    const result = createFrontendConfig({
      ...defaultConfig,
      buildType: "production",
    });

    expect(result.mode).toBe("production");
  });

  it("Given a frontend options in test mode, it should return a production configuration", () => {
    const result = createFrontendConfig({
      ...defaultConfig,
      buildType: "test",
    });

    expect(result.mode).toBe("production");
  });

  it("Given a frontend options with aliases, it should return a configuration with aliases", () => {
    const result = createFrontendConfig(defaultConfig);

    if (result.resolve === undefined) {
      throw new Error("Resolve is undefined");
    }
    expect(result.resolve.alias).toStrictEqual(defaultConfig.aliases);
  });

  it("Given a frontend options with entry, it should return a configuration with entry", () => {
    const result = createFrontendConfig(defaultConfig);

    expect(result.entry).toStrictEqual({
      main: [
        "./src/index.ts",
        "webpack-hot-middleware/client?path=/__webpack_hmr&reload=false&timeout=20000",
      ],
    });
  });

  it("Given a frontend options with output, it should return a configuration with output", () => {
    const result = createFrontendConfig(defaultConfig);

    if (result.output === undefined) {
      throw new Error("Output is undefined");
    }
    expect(result.output.path).toBe(defaultConfig.output);
  });

  it("Given a frontend options with subdomain, it should return a configuration with development mode defined", () => {
    const result = createFrontendConfig(defaultConfig);

    const definitions = getDefinitions(result.plugins);
    if (definitions === null) {
      throw new Error("Definitions is null");
    }

    expect(definitions.__DEVELOPMENT__).toBe(true);
  });

  it("Given a frontend options in test mode then configuration should contain only html and definitions plugins", () => {
    const result = createFrontendConfig({
      ...defaultConfig,
      buildType: "test",
    });

    expect(result.plugins).toHaveLength(2);
    if (result.plugins === undefined || result.plugins.length !== 2) {
      throw new Error("Plugins is undefined");
    }
    expect(result.plugins[0]).toBeInstanceOf(HtmlWebpackPlugin);
    expect(result.plugins[1]).toBeInstanceOf(webpack.DefinePlugin);
  });
});
