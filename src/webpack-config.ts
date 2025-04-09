import { Configuration } from "webpack";
import path from "path";
import { BuildType } from "./types/lib.js";
import { LiknurConfig } from "./parse-config.js";
import createBackendConfig, { BackendOptions } from "@/backend";
import createFrontendConfig, { FrontendOptions } from "@/frontend";
import { getServicesToBuild, filterServices, getAliases } from "@/extracts";
import { ServiceInfo } from "@/types/common";
import chalk from "chalk";
import type { PathLike } from "node:fs";
import { merge } from "webpack-merge";

function getBackendOptions(
  buildMode: BuildType,
  backendServices: Record<string, ServiceInfo>,
  frontendServices: Record<string, ServiceInfo>,
  aliases: Record<string, PathLike>,
  projectConfig: PathLike,
): BackendOptions {
  const output = path.resolve("dist", buildMode, "server");
  return {
    buildType: buildMode,
    backendServices,
    frontendServices,
    aliases,
    entry: "./src/backend/index.ts",
    output,
    projectConfig,
  };
}

function validateServices(
  servicesToBuildSet: ReadonlySet<string>,
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
  const services = config.parsed.services;
  for (const service of services) {
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

export async function liknurWebpackDev(
  liknurConfig: LiknurConfig,
  frontendServices: ReadonlyArray<string>,
): Promise<ReadonlyArray<Configuration>> {
  const servicesToBuildSet = getServicesToBuild(
    liknurConfig,
    frontendServices,
    "development",
  );
  if (!validateServices(servicesToBuildSet, liknurConfig)) {
    return [];
  }

  const frontendAliases = getAliases(liknurConfig, "frontend", "resolve");

  const frontendWebpackConfigs = await frontendConfigurations(
    liknurConfig,
    servicesToBuildSet,
    frontendAliases,
    "development",
  );

  return frontendWebpackConfigs;
}

export async function liknurWebpack(
  liknurConfig: LiknurConfig,
  buildMode: BuildType,
  servicesToBuild: ReadonlyArray<string>,
): Promise<Configuration[]> {
  const servicesToBuildSet = getServicesToBuild(
    liknurConfig,
    servicesToBuild,
    buildMode,
  );
  if (!validateServices(servicesToBuildSet, liknurConfig)) {
    return [];
  }
  const backendServices = filterServices(
    liknurConfig,
    servicesToBuildSet,
    "backend",
  );

  const frontendServices = filterServices(
    liknurConfig,
    servicesToBuildSet,
    "frontend",
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

  const backendAliases = getAliases(liknurConfig, "backend", "resolve");
  const frontendAliases = getAliases(liknurConfig, "frontend", "resolve");

  console.log("Aliases for frontend services:");
  Object.entries(frontendAliases).forEach(([key, val]) => {
    console.log(" ".repeat(4) + chalk.bold(key) + ` : ${val.toString()}`);
  });
  console.log(`\n`);
  console.log("Aliases for backend services:");
  Object.entries(backendAliases).forEach(([key, val]) => {
    console.log(" ".repeat(4) + chalk.bold(key) + ` : ${val.toString()}`);
  });
  console.log(`\n`);

  console.log("Building " + chalk.bold("server") + " component");

  const options = getBackendOptions(
    buildMode,
    backendServices,
    frontendServices,
    backendAliases,
    liknurConfig.file,
  );

  const backendWebpackConfig = createBackendConfig(options);
  if (buildMode === "development") return [backendWebpackConfig];

  const frontendWebpackConfigs = await frontendConfigurations(
    liknurConfig,
    servicesToBuildSet,
    frontendAliases,
    buildMode,
  );

  return [backendWebpackConfig, ...frontendWebpackConfigs];
}

async function frontendConfigurations(
  config: LiknurConfig,
  servicesToBuildSet: ReadonlySet<string>,
  aliases: Readonly<Record<string, PathLike>>,
  buildMode: BuildType,
): Promise<Configuration[]> {
  const retval: Configuration[] = [];
  const services = config.parsed.services;
  let userWebpackConfig: Configuration | undefined;
  if (config.parsed.settings?.frontendWebpackConfig) {
    const userWebpackConfigPath = path.resolve(
      config.parsed.settings.frontendWebpackConfig,
    );
    console.log(
      "Using user webpack configuration from " +
        chalk.gray(userWebpackConfigPath),
    );

    const moduleConfig = (await import(userWebpackConfigPath)) as unknown as {
      default: (buildMode: BuildType) => Configuration;
    };
    userWebpackConfig = moduleConfig.default(buildMode);
  }

  for (const service of services) {
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
    const frontendParams: FrontendOptions = {
      name: service.name,
      entry: path.resolve("src/frontend", service.name, "index"),
      buildType: buildMode,
      aliases,
      output,
    };

    console.log(`Frontend entry point: ${frontendParams.entry.toString()}`);
    console.log(`Frontend output: ${frontendParams.output.toString()}`);

    const frontendWebpackConfig = createFrontendConfig(frontendParams);
    if (frontendWebpackConfig == null) {
      throw new Error("Invalid frontend configuration");
    }
    if (userWebpackConfig) {
      const mergedConfig = merge(frontendWebpackConfig, userWebpackConfig);
      retval.push(mergedConfig);
    } else {
      retval.push(frontendWebpackConfig);
    }
  }

  return retval;
}
