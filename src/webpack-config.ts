import { Configuration } from "webpack";
import path from "path";
import { BuildType } from "./types/lib.js";
import { LiknurConfig } from "./schema-config.js";
import createBackendConfig, { BackendOptions } from "@/backend";
import createFrontendConfig, { FrontendOptions } from "@/frontend";
import { getServicesToBuild, filterServices, getAliases } from "@/extracts";
import { ServiceInfo } from "@/types/common";
import { PathLike } from "fs";
import chalk from "chalk";

function getBackendOptions(
  buildMode: BuildType,
  backendServices: Record<string, ServiceInfo>,
  frontendServices: Record<string, ServiceInfo>,
  aliases: Record<string, PathLike>,
): BackendOptions {
  const output = path.resolve("dist", buildMode, "server");
  return {
    buildType: buildMode,
    backendServices,
    frontendServices,
    aliases,
    entry: "./src/backend/index.ts",
    output,
  };
}

function validateServices(
  servicesToBuildSet: Set<string>,
  config: LiknurConfig,
): boolean {
  if (servicesToBuildSet.size === 0) {
    console.log(chalk.red("No services to build"));
    return false;
  }

  const subdomains = {
    frontend: new Set<string>(),
    backend: new Set<string>(),
  };
  for (const service of config.services) {
    if (!servicesToBuildSet.has(service.name)) continue;

    if (subdomains[service.serviceType].has(service.subdomain)) {
      console.log(
        chalk.red(
          `Subdomain "${service.subdomain}" for service "${service.name}" is already in use by another service`,
        ),
      );
      return false;
    }
    subdomains[service.serviceType].add(service.subdomain);
  }
  return true;
}

export function liknurWebpack(
  liknurConfig: LiknurConfig,
  buildMode: BuildType,
  servicesToBuild: string[],
): Configuration[] {
  const servicesToBuildSet = getServicesToBuild(
    servicesToBuild,
    liknurConfig,
    buildMode,
  );
  if (!validateServices(servicesToBuildSet, liknurConfig)) {
    return [];
  }
  const backendServices = filterServices(
    "backend",
    liknurConfig,
    servicesToBuildSet,
  );

  const frontendServices = filterServices(
    "frontend",
    liknurConfig,
    servicesToBuildSet,
  );

  console.log(
    "Building services " +
      chalk.bold(Array.from(servicesToBuildSet).join(", ")) +
      " in " +
      chalk.bold(buildMode) +
      " mode",
  );
  console.log(
    "Available backend services: " +
      chalk.bold(Object.keys(backendServices).join(", ")),
  );
  console.log(
    "Available frontend services: " +
      chalk.bold(Object.keys(frontendServices).join(", ")),
  );

  const backendAliases = getAliases("backend", liknurConfig);
  const frontendAliases = getAliases("frontend", liknurConfig);

  for (const key in frontendAliases) {
    if (typeof frontendAliases[key] !== "string") {
      throw new Error("Invalid type");
    }

    frontendAliases[key] = path.resolve(frontendAliases[key]);
  }

  for (const key in backendAliases) {
    if (typeof backendAliases[key] !== "string") {
      throw new Error("Invalid type");
    }

    backendAliases[key] = path.resolve(backendAliases[key]);
  }

  console.log("Building " + chalk.bold("server") + " component");

  const options = getBackendOptions(
    buildMode,
    backendServices,
    frontendServices,
    backendAliases,
  );
  const backendWebpackConfig = createBackendConfig(options);
  if (buildMode === "development") return [backendWebpackConfig];

  const frontendWebpackConfigs = frontendConfigurations(
    servicesToBuildSet,
    frontendAliases,
    liknurConfig,
    buildMode,
  );

  return [backendWebpackConfig, ...frontendWebpackConfigs];
}

function frontendConfigurations(
  servicesToBuildSet: Set<string>,
  aliases: Record<string, PathLike>,
  config: LiknurConfig,
  buildMode: BuildType,
): Configuration[] {
  const retval: Configuration[] = [];

  for (const service of config.services) {
    if (
      !servicesToBuildSet.has(service.name) ||
      service.serviceType !== "frontend"
    ) {
      continue;
    }

    const output = path.resolve(
      "dist",
      buildMode,
      "static-content",
      service.name,
    );
    const frontendParams = {
      name: service.name,
      entry: path.resolve("src/frontend", service.name, "index"),
      buildType: buildMode,
      aliases,
      output,
    } satisfies FrontendOptions;

    console.log(`Frontend entry point: ${frontendParams.entry}`);
    console.log(`Frontend output: ${frontendParams.output}`);

    const frontendWebpackConfig = createFrontendConfig(frontendParams);
    if (frontendWebpackConfig == null) {
      throw new Error("Invalid frontend configuration");
    }

    retval.push(frontendWebpackConfig);
  }

  return retval;
}
