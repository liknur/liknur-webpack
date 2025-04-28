import { ServiceType } from "@/types/lib";
import { LiknurConfig } from "@/parse-config";
import { ServiceInfo } from "@/types/common";
import { PathLike } from "fs";
import { BuildType } from "@/types/lib";
import path from "path";

export function getAliases(
  config: LiknurConfig,
  serviceType?: ServiceType,
  resolve?: "resolve",
): Readonly<Record<string, PathLike>> {
  let retval: Record<string, PathLike> = {};

  const aliases = config.parsed.aliases;

  if (aliases == null) {
    return retval;
  }

  const backendAliases = aliases.backend;
  const frontendAliases = aliases.frontend;
  const commonAliases = aliases.common;
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

  if (resolve === "resolve") {
    Object.keys(retval).forEach((key) => {
      retval[key] = path.resolve(retval[key].toString());
    });
  }

  return retval;
}

export function filterServices(
  config: LiknurConfig,
  servicesToBuild: ReadonlySet<string>,
  serviceType: ServiceType,
): Record<string, ServiceInfo> {
  const retval: Record<string, ServiceInfo> = {};

  for (const service of config.parsed.services)
    if (service['service-type'] === serviceType) {
      retval[service.name] = { toBuild: false, subdomain: service.subdomain };
    }

  for (const service of config.parsed.services) {
    if (
      service['service-type'] === serviceType &&
      servicesToBuild.has(service.name)
    ) {
      retval[service.name].toBuild = true;
    }
  }

  return retval;
}

export function getServicesToBuild(
  config: LiknurConfig,
  servicesToBuild: ReadonlyArray<string>,
  buildMode: BuildType,
): ReadonlySet<string> {
  const retval = new Set<string>();

  if (servicesToBuild.length === 0) {
    for (const service of config.parsed.services) {
      if (service['build-type'].includes(buildMode)) {
        retval.add(service.name);
      }
    }
    return retval;
  }

  const allServices = new Set(
    config.parsed.services
      .filter((service) => service['build-type'].includes(buildMode))
      .map(
        (service: LiknurConfig["parsed"]["services"][number]) => service.name,
      ),
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
