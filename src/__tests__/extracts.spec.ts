import { describe, expect, it } from "@jest/globals";
jest.spyOn(console, "log").mockImplementation(() => {});
import { LiknurConfig } from "@/schema-config";
import { getServicesToBuild, filterServices, getAliases } from "@/extracts";

describe("Check whether a services to build are in the configuration", () => {
  let config: LiknurConfig;

  beforeEach(() => {
    config = {
      name: "Project",
      version: "1.0.0",
      services: [
        {
          name: "api",
          serviceType: "backend",
          subdomain: "sub",
          buildType: ["development", "production", "test"],
        },
        {
          name: "content",
          serviceType: "frontend",
          subdomain: "sub",
          buildType: ["development", "production", "test"],
        },
      ],
    };
  });

  it("Given a valid configuration, and services exists then return same services", () => {
    const result = getServicesToBuild(
      ["api", "content"],
      config,
      "development",
    );

    expect(result).toStrictEqual(new Set<string>(["api", "content"]));
  });

  it("Given a valid configuration, and services do not exist then return empty array", () => {
    const result = getServicesToBuild(
      ["api", "content", "invalid"],
      config,
      "development",
    );

    expect(result).toStrictEqual(new Set<string>());
  });

  it("Given a valid configuration, and no services then return full list of services", () => {
    const result = getServicesToBuild([], config, "development");

    expect(result).toStrictEqual(new Set<string>(["api", "content"]));
  });

  it("Given a valid configuration, and one service then return that service", () => {
    const result = getServicesToBuild(["api"], config, "development");

    expect(result).toStrictEqual(new Set<string>(["api"]));
  });
});

describe("Filter frontend services from Liknur configuration and service type", () => {
  let config: LiknurConfig;

  beforeEach(() => {
    config = {
      name: "Project",
      version: "1.0.0",
      services: [
        {
          name: "api",
          serviceType: "backend",
          subdomain: "sub",
          buildType: ["development", "production", "test"],
        },
        {
          name: "content",
          serviceType: "frontend",
          subdomain: "sub",
          buildType: ["development", "production", "test"],
        },
      ],
    };
  });

  it("Given a valid configuration, and service exists then return same service", () => {
    const frontendServices = filterServices(
      "frontend",
      config,
      new Set(["content"]),
    );

    expect(frontendServices).toStrictEqual({
      content: { toBuild: true, subdomain: "sub" },
    });
  });

  it("Given a valid configuration, and service does not exist then return empty array", () => {
    const frontendServices = filterServices(
      "frontend",
      config,
      new Set(["invalid"]),
    );

    expect(frontendServices).toStrictEqual({
      content: { toBuild: false, subdomain: "sub" },
    });
  });

  it("Given a valid configuration, and no frontend services then return empty array", () => {
    const frontendServices = filterServices("frontend", config, new Set([]));

    expect(frontendServices).toStrictEqual({
      content: { toBuild: false, subdomain: "sub" },
    });
  });

  it("Given a valid configuration, and all frontend services then return all frontend services", () => {
    const frontendServices = filterServices(
      "frontend",
      config,
      new Set(["content", "api"]),
    );

    expect(frontendServices).toStrictEqual({
      content: { toBuild: true, subdomain: "sub" },
    });
  });
});

describe("Getting frontend aliases from Liknur configuration", () => {
  let config: LiknurConfig;

  beforeEach(() => {
    config = {
      name: "Project",
      version: "1.0.0",
      aliases: {
        frontend: {
          "@frontend": "src/frontend",
        },
      },
      services: [
        {
          name: "api",
          serviceType: "backend",
          subdomain: "sub",
          buildType: ["development", "production", "test"],
        },
      ],
    };
  });

  it("Given a valid configuration with frontend aliases then return frontend aliases", () => {
    const aliases = getAliases("frontend", config);
    expect(aliases).toStrictEqual({
      "@frontend": "src/frontend",
    });
  });

  it("Given only common aliases and no frontend aliases then return only common aliases", () => {
    delete config?.aliases?.frontend;
    if (config.aliases === undefined) {
      config.aliases = {};
    }
    config.aliases.common = {
      "@common": "src/common",
    };

    const aliases = getAliases("frontend", config);
    expect(aliases).toStrictEqual({ "@common": "src/common" });
  });

  it("Given no aliases then return empty object", () => {
    delete config.aliases;

    const aliases = getAliases("frontend", config);
    expect(aliases).toStrictEqual({});
  });

  it("Given frontend, backend and common aliases then return frontend aliases", () => {
    if (config.aliases === undefined) {
      config.aliases = {};
    }
    config.aliases.backend = {
      "@backend": "src/backend",
    };
    config.aliases.common = {
      "@common": "src/common",
    };

    const aliases = getAliases("frontend", config);
    expect(aliases).toStrictEqual({
      "@frontend": "src/frontend",
      "@common": "src/common",
    });
  });

  it("Given common, backend and frontend aliases when no build type then return all aliases", () => {
    if (config.aliases === undefined) {
      config.aliases = {};
    }
    config.aliases.backend = {
      "@backend": "src/backend",
    };
    config.aliases.common = {
      "@common": "src/common",
    };
    config.aliases.frontend = {
      "@frontend": "src/frontend",
    };

    const aliases = getAliases(null, config);
    expect(aliases).toStrictEqual({
      "@frontend": "src/frontend",
      "@common": "src/common",
      "@backend": "src/backend",
    });
  });
});
