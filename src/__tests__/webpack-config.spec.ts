import path from "path";
import { describe, expect, it } from "@jest/globals";
import type { LiknurConfig } from "@/parse-config";
import { JSONValue } from "@/types/common";

jest.mock("@/backend");
jest.mock("chalk", () => ({
  red: (text: string): string => text,
  bold: (text: string): string => text,
  whiteBright: (text: string): string => text,
}));

jest.spyOn(console, "log").mockImplementation(() => {});

import createBackendConfig, { BackendOptions } from "@/backend";
import { liknurWebpack } from "@/webpack-config";

function isJSONObject(val: JSONValue): val is { [key: string]: JSONValue } {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

describe("Generate webpack configuration based on Liknur configuration", () => {
  let defaultConfig: LiknurConfig["parsed"];
  let options: BackendOptions;
  beforeEach(() => {
    defaultConfig = {
      name: "Project",
      version: "1.0.0",
      aliases: {
        common: {
          "@common": "src/common",
        },
        backend: {
          "@backend": "src/backend",
        },
        frontend: {
          "@frontend": "src/frontend",
        },
      },
      services: [
        {
          name: "public",
          serviceType: "frontend",
          subdomain: "pub",
          buildType: ["development", "production", "test"],
        },
        {
          name: "api",
          serviceType: "backend",
          subdomain: "api",
          buildType: ["development", "production", "test"],
        },
      ],
    } satisfies LiknurConfig["parsed"];
    options = {
      buildType: "development",
      backendServices: { api: { toBuild: true, subdomain: "api" } },
      frontendServices: { public: { toBuild: false, subdomain: "pub" } },
      aliases: {
        "@common": path.resolve("src/common"),
        "@backend": path.resolve("src/backend"),
      },
      entry: "./src/backend/index.ts",
      output: path.resolve("dist", "development", "server"),
      projectConfig: path.resolve("project.config.yaml"),
    };
  });

  it("Given a valid Liknur configuration file, it should return webpack configuration", async () => {
    options.output = path.resolve("dist", "development", "server");
    await liknurWebpack(
      { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
      "development",
      ["api"],
    );

    expect(createBackendConfig).toHaveBeenCalledWith(options);
  });

  it("Given a valid Liknur configuration file and multiple services, it should return webpack configuration", async () => {
    options.frontendServices = { public: { toBuild: true, subdomain: "pub" } };
    await liknurWebpack(
      { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
      "development",
      ["api", "public"],
    );

    expect(createBackendConfig).toHaveBeenCalledWith(options);
  });

  it("when no services are provided, it should return webpack configuration", async () => {
    options.frontendServices = { public: { toBuild: true, subdomain: "pub" } };
    await liknurWebpack(
      { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
      "development",
      [],
    );

    expect(createBackendConfig).toHaveBeenCalledWith(options);
  });

  it("When two services with the same name and serviceType provided, it should cause an error", async () => {
    if (isJSONObject(defaultConfig.services[0])) {
      defaultConfig.services.push({
        name: "api",
        serviceType: "backend",
        subdomain: "api",
        buildType: ["development", "production", "test"],
      } satisfies LiknurConfig["parsed"]["services"][number]);
    }

    expect(
      await liknurWebpack(
        { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
        "development",
        ["api"],
      ),
    ).toStrictEqual([]);
  });

  it("When two services with the same subdomain and different serviceType provided no error should be thrown", async () => {
    options.frontendServices = {
      public: { toBuild: true, subdomain: "pub" },
      api: { toBuild: true, subdomain: "api" },
    };
    if (isJSONObject(defaultConfig.services[0])) {
      defaultConfig.services.push({
        name: "api",
        serviceType: "frontend",
        subdomain: "api",
        buildType: ["development", "production", "test"],
      } satisfies LiknurConfig["parsed"]["services"][number]);
    }

    await liknurWebpack(
      { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
      "development",
      [],
    );

    expect(createBackendConfig).toHaveBeenCalledWith(options);
  });

  it("When service is not in buildType, it should not be built", async () => {
    if (isJSONObject(defaultConfig.services[0])) {
      defaultConfig.services.push({
        name: "user",
        serviceType: "frontend",
        subdomain: "user",
        buildType: ["development", "production"],
      } satisfies LiknurConfig["parsed"]["services"][number]);
    }

    options.frontendServices = {
      public: { toBuild: true, subdomain: "pub" },
      user: { toBuild: false, subdomain: "user" },
    };

    options.buildType = "test";
    options.output = path.resolve("dist", "test", "server");

    await liknurWebpack(
      { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
      "test",
      ["api", "public"],
    );

    expect(createBackendConfig).toHaveBeenCalledWith(options);
  });

  it("When frontend and backend services are provided in development mode only backend service should be built", async () => {
    const configurations = await liknurWebpack(
      { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
      "development",
      [],
    );

    expect(configurations.length).toBe(1);
  });

  it("When frontend and backend services are provided in production mode both should be built", async () => {
    const configurations = await liknurWebpack(
      { parsed: defaultConfig, file: path.resolve("project.config.yaml") },
      "production",
      [],
    );

    expect(configurations.length).toBe(2);
  });
});
