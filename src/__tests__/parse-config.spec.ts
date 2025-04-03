import { describe, expect, it } from "@jest/globals";
import { parseConfiguration } from "@/parse-config";
import type { JSONValue } from "@/types/common";
import type { LiknurConfig } from "@/schema-config";
import YAML from "yaml";
import * as fs from "node:fs/promises";

jest.mock("node:fs/promises");

const mockedFs = fs as jest.Mocked<typeof fs>;

function isJSONObject(val: JSONValue): val is { [key: string]: JSONValue } {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

describe("parseConfiguration KNUR configuration file", () => {
  let defaultConfig: JSONValue;
  let finalConfig: LiknurConfig;
  beforeEach(() => {
    defaultConfig = {
      name: "Project",
      version: "1.0.0",
      services: [{ name: "Service", serviceType: "frontend" }],
    } satisfies JSONValue;
    finalConfig = {
      name: "Project",
      version: "1.0.0",
      services: [
        {
          name: "Service",
          serviceType: "frontend",
          subdomain: "",
          buildType: ["development", "production", "test"],
        },
      ],
    } satisfies LiknurConfig;
  });

  it("Given a valid configuration file, it should return success", async () => {
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(finalConfig);
  });

  it("Given project name shorter than 3 characters, it should return an error", async () => {
    if (
      typeof defaultConfig === "object" &&
      defaultConfig !== null &&
      !Array.isArray(defaultConfig)
    ) {
      defaultConfig.name = "A";
    } else {
      throw new Error("Invalid type");
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'name': Project name must contain at least 3 characters",
    );
  });

  it("Given project name longer than 50 characters, it should return an error", async () => {
    if (
      typeof defaultConfig === "object" &&
      defaultConfig !== null &&
      !Array.isArray(defaultConfig)
    ) {
      defaultConfig.name = "A".repeat(51);
    } else {
      throw new Error("Invalid type");
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'name': Project name must contain at most 50 characters",
    );
  });

  it("Given a configuration file with an invalid field, it should return an error", async () => {
    if (
      typeof defaultConfig === "object" &&
      defaultConfig !== null &&
      !Array.isArray(defaultConfig)
    ) {
      defaultConfig.invalidField = "invalid";
    } else {
      throw new Error("Invalid type");
    }

    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'root': Unrecognized key(s) in object: 'invalidField'",
    );
  });

  it("Given a configuration file with a missing required field, it should return an error", async () => {
    mockedFs.readFile.mockResolvedValueOnce(
      YAML.stringify({ version: "1.0.0" }),
    );

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Field 'name': Required");
  });
});

describe("Aliases parsing tests from Liknur configuration file", () => {
  let defaultConfig: JSONValue;
  let finalConfig: LiknurConfig;
  beforeEach(() => {
    defaultConfig = {
      name: "Project",
      version: "1.0.0",
      services: [{ name: "Service", serviceType: "frontend" }],
    } satisfies JSONValue;
    finalConfig = {
      name: "Project",
      version: "1.0.0",
      services: [
        {
          name: "Service",
          serviceType: "frontend",
          subdomain: "",
          buildType: ["development", "production", "test"],
        },
      ],
    } satisfies LiknurConfig;
  });

  it("Given a configuration file with common aliases, it should return success", async () => {
    const aliases: JSONValue = { "@alias": "valid.ts" };
    if (isJSONObject(defaultConfig)) {
      defaultConfig.aliases = { common: aliases };
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));
    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(true);
    finalConfig.aliases = { common: { "@alias": "valid.ts" } };
    expect(result.data).toStrictEqual(finalConfig);
  });

  it("Given a configuration file with frontend aliases, it should return success", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.aliases = { frontend: {} };
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(true);

    finalConfig.aliases = { frontend: {} };
    expect(result.data).toStrictEqual(finalConfig);
  });

  it("Given a configuration file with backend aliases, it should return success", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.aliases = { backend: {} };
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(true);
    finalConfig.aliases = { backend: {} };
    expect(result.data).toStrictEqual(finalConfig);
  });

  it("Given a configuration file with an invalid common alias, it should return an error", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.aliases = { common: { invalidAlias: "invalid" } };
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'aliases.common.invalidAlias': Invalid",
    );
  });

  it("Given a configuration file with an invalid frontend alias file name, it should return an error", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.aliases = { frontend: { "@alias": "invalid" } };
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));
    mockedFs.access.mockRejectedValueOnce(new Error("File does not exist"));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'aliases.frontend.@alias': File or directory does not exist",
    );
  });

  it("Given a configuration file with valid frontend alias, it should return success", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.aliases = { frontend: { "@alias": "valid.ts" } };
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));
    mockedFs.access.mockResolvedValueOnce();

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(true);
    finalConfig.aliases = { frontend: { "@alias": "valid.ts" } };
    expect(result.data).toStrictEqual(finalConfig);
  });

  it("Given a configuration file with non existing backend alias file, it should return an error", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.aliases = { backend: { "@alias": "non-existing.ts" } };
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));
    mockedFs.access.mockRejectedValueOnce(new Error("File does not exist"));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'aliases.backend.@alias': File or directory does not exist",
    );
  });
});

describe("Testing liknu configuration file with services", () => {
  let defaultConfig: JSONValue;
  let finalConfig: LiknurConfig;
  beforeEach(() => {
    defaultConfig = {
      name: "Project",
      version: "1.0.0",
      services: [{ name: "Service", serviceType: "frontend" }],
    } satisfies JSONValue;
    finalConfig = {
      name: "Project",
      version: "1.0.0",
      services: [
        {
          name: "Service",
          serviceType: "frontend",
          subdomain: "",
          buildType: ["development", "production", "test"],
        },
      ],
    } satisfies LiknurConfig;
  });

  it("Given a configuration file with services, it should return success", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.services = [{ name: "Service", serviceType: "frontend" }];
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(finalConfig);
  });

  it("Given a configuration file with a service name shorter than 3 characters, it should return an error", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.services = [{ name: "A" }];
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'services.0.name': String must contain at least 3 character(s)",
    );
  });

  it("Given a configuration file with a service subdomain containing invalid characters, it should return an error", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.services = [{ name: "Service", subdomain: "invalid!" }];
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Field 'services.0.subdomain': Invalid");
  });

  it("Given a configuration file with a service subdomain longer than 15 characters, it should return an error", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.services = [{ name: "Service", subdomain: "A".repeat(16) }];
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'services.0.subdomain': String must contain at most 15 character(s)",
    );
  });

  it("Given a configuration file with a service type other than frontend or backend, it should return an error", async () => {
    if (isJSONObject(defaultConfig)) {
      defaultConfig.services = [{ name: "Service", serviceType: "invalid" }];
    }
    mockedFs.readFile.mockResolvedValueOnce(YAML.stringify(defaultConfig));

    const result = await parseConfiguration("dummy/path.yaml");

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Field 'services.0.serviceType': Invalid enum value. Expected 'frontend' | 'backend', received 'invalid'",
    );
  });
});
