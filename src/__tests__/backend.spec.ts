import { describe, expect, it } from "@jest/globals";
import webpack, { Configuration } from "webpack";

jest.spyOn(console, "log").mockImplementation(() => {});
jest.mock("chalk", () => ({
  red: (text: string): string => text,
  bold: (text: string): string => text,
  green: (text: string): string => text,
}));

import createBackendConfig, { BackendOptions } from "@/backend";

function getDefinitions(
  plugins: Configuration["plugins"],
): Record<string, string | boolean> | null {
  if (plugins === undefined || plugins.length === 0 || plugins[0] == null) {
    return null;
  }

  const plugin = plugins?.[0];
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
  let defaultConfig: BackendOptions;
  beforeEach(() => {
    defaultConfig = {
      buildType: "development",
      backendServices: { Project: { toBuild: true, subdomain: "api" } },
      frontendServices: {},
      aliases: {
        "@common": "src/common",
      },
      entry: "./src/index.ts",
      output: "dist",
      projectConfig: "project.config.yaml",
    };
  });

  it("Given a valid backend options, it should return webpack configuration", () => {
    const result = createBackendConfig(defaultConfig);

    expect(result).toBeDefined();
  });

  it("Given a backend options in development mode, it should return a development configuration", () => {
    const result = createBackendConfig(defaultConfig);

    expect(result.mode).toBe("development");
  });

  it("Given a backend options in production mode, it should return a production configuration", () => {
    const result = createBackendConfig({
      ...defaultConfig,
      buildType: "production",
    });

    expect(result.mode).toBe("production");
  });

  it("Given a backend options in test mode, it should return a production configuration", () => {
    const result = createBackendConfig({ ...defaultConfig, buildType: "test" });

    expect(result.mode).toBe("production");
  });

  it("Given a backend options with aliases, it should return a configuration with aliases", () => {
    const result = createBackendConfig(defaultConfig);

    if (result.resolve === undefined) {
      throw new Error("Resolve is undefined");
    }
    expect(result.resolve.alias).toStrictEqual(defaultConfig.aliases);
  });

  it("Given a backend options with entry, it should return a configuration with entry", () => {
    const result = createBackendConfig(defaultConfig);

    expect(result.entry).toBe(defaultConfig.entry);
  });

  it("Given a backend options with output, it should return a configuration with output", () => {
    const result = createBackendConfig(defaultConfig);

    if (result.output === undefined) {
      throw new Error("Output is undefined");
    }
    expect(result.output.path).toBe(defaultConfig.output);
  });

  it("Given a backend options with subdomain, it should return a configuration with subdomain", () => {
    const result = createBackendConfig(defaultConfig);

    const definitions = getDefinitions(result.plugins);
    if (definitions === null) {
      throw new Error("Definitions is null");
    }

    expect(definitions.__BACKEND_PROJECT_SUBDOMAIN__).toBe('"api"');
  });

  it("Given a backend options with backend services, it should return a configuration with backend services", () => {
    const result = createBackendConfig(defaultConfig);

    const definitions = getDefinitions(result.plugins);
    if (definitions === null) {
      throw new Error("Definitions is null");
    }
    expect(definitions.__BACKEND_PROJECT_SERVICE__).toBe(true);
  });
});
