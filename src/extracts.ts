import { ServiceType } from "@/types/lib";
import { LiknurConfig } from "@/schema-config";
import { ServiceInfo } from "@/types/common";
import { PathLike } from "fs";
import { BuildType } from "@/types/lib";

export function getAliases(
  serviceType: ServiceType | null,
  config: LiknurConfig,
): Record<string, PathLike> {
  let retval: Record<string, PathLike> = {};

  if (config.aliases === undefined) {
    return retval;
  }

  const backendAliases = config.aliases.backend;
  const frontendAliases = config.aliases.frontend;
  const commonAliases = config.aliases.common;
  if (commonAliases != null) {
    retval = { ...commonAliases };
  }

  if (
    (serviceType === "frontend" || serviceType == null) &&
    frontendAliases != null
  ) {
    retval = { ...retval, ...frontendAliases };
  }

  if (
    (serviceType === "backend" || serviceType == null) &&
    backendAliases != null
  ) {
    retval = { ...retval, ...backendAliases };
  }

  return retval;
}

export function filterServices(
  serviceType: ServiceType,
  config: LiknurConfig,
  servicesToBuild: Set<string>,
): Record<string, ServiceInfo> {
  const retval: Record<string, ServiceInfo> = {};

  for (const service of config.services)
    if (service.serviceType === serviceType) {
      retval[service.name] = { toBuild: false, subdomain: service.subdomain };
    }

  for (const service of config.services) {
    if (
      service.serviceType === serviceType &&
      servicesToBuild.has(service.name)
    ) {
      retval[service.name].toBuild = true;
    }
  }

  return retval;
}

export function getServicesToBuild(
  servicesToBuild: string[],
  config: LiknurConfig,
  buildMode: BuildType,
): Set<string> {
  const retval = new Set<string>();

  if (servicesToBuild.length === 0) {
    for (const service of config.services) {
      if (service.buildType.includes(buildMode)) {
        retval.add(service.name);
      }
    }
    return retval;
  }

  const allServices = new Set(
    config.services
      .filter((service) => service.buildType.includes(buildMode))
      .map((service: LiknurConfig["services"][number]) => service.name),
  );

  for (const serviceName of servicesToBuild) {
    if (!allServices.has(serviceName)) {
      console.log(`Service ${serviceName} not found in configuration`);
      return new Set<string>();
    }
    retval.add(serviceName);
  }

  return retval;
}
