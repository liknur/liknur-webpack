import { PathLike } from "fs";
import webpack, { Configuration } from "webpack";
import { BuildType, ServiceType } from "./types/lib.js";
import nodeExternals from "webpack-node-externals";
import chalk from "chalk";
import { ServiceInfo } from "./types/common";

export interface BackendOptions {
  buildType: BuildType;
  backendServices: Record<string, ServiceInfo>;
  frontendServices: Record<string, ServiceInfo>;
  aliases: Record<string, PathLike>;
  entry: PathLike;
  output: PathLike;
}

type BackendDefinitionsOptions = Pick<
  BackendOptions,
  "backendServices" | "frontendServices" | "buildType"
>;

function servicesToArrays(services: Record<string, ServiceInfo>): string[] {
  const retval: string[] = [];
  Object.entries(services).forEach(([key, service]: [string, ServiceInfo]) => {
    if (service == null) {
      throw new Error("Undefined service");
      // eslint-disable-next-line
    } else if (service.toBuild) {
      retval.push(key);
    }
  });

  return retval;
}

function servicesToDefinitions(
  serviceType: ServiceType,
  services: Record<string, ServiceInfo>,
): Record<string, string | boolean> {
  const retval: Record<string, string | boolean> = {};
  Object.entries(services).forEach(([key, val]: [string, ServiceInfo]) => {
    // eslint-disable-next-line
    retval[`__${serviceType.toUpperCase()}_${key.toUpperCase()}_SERVICE__`] =
      // eslint-disable-next-line
      val.toBuild;

    retval[`__${serviceType.toUpperCase()}_${key.toUpperCase()}_SUBDOMAIN__`] =
      // eslint-disable-next-line
    JSON.stringify(val.subdomain, null, 2);
      
  });
  return retval;
}

function printDefinitions(definitions: Record<string, string | boolean>): void {
  console.log(chalk.green("Definitions by webpack.DefinePlugin:"));
  Object.entries(definitions).forEach(([key, val]) => {
    console.log(" ".repeat(4) + chalk.bold(key) + ` : ${val}`);
  });
  console.log(`\n`);
}

function createDefinitions(
  params: BackendDefinitionsOptions,
): webpack.DefinePlugin {
  const backendServices = servicesToArrays(params.backendServices);
  const frontendServices = servicesToArrays(params.frontendServices);
  const definitions: Record<string, string | boolean> = {
    __DEVELOPMENT__: params.buildType === "development",
    __TEST__: params.buildType === "test",
    __TEST_JEST__: false,
    __PRODUCTION__: params.buildType === "production",
    __BACKEND_SERVICES__: JSON.stringify(backendServices),
    __FRONTEND_SERVICES__: JSON.stringify(frontendServices),
    ...servicesToDefinitions("backend", params.backendServices),
    ...servicesToDefinitions("frontend", params.frontendServices),
  };

  printDefinitions(definitions);

  return new webpack.DefinePlugin(definitions);
}

function webpackMode(buildType: BuildType): "development" | "production" {
  return buildType === "development" ? "development" : "production";
}

export default function backend(params: BackendOptions): Configuration {
  return {
    name: "server",
    mode: webpackMode(params.buildType),
    target: "node",
    externals: [nodeExternals()],
    externalsPresets: {
      node: true,
    },
    entry: params.entry as string,
    stats: "minimal",
    output: {
      path: params.output as string,
      filename: "main.cjs",
    },
    optimization: {
      usedExports: true,
    },
    resolve: {
      extensions: [".ts", ".js"],
      alias: params.aliases as Record<string, string>,
    },
    module: {
      rules: [
        {
          test: /\.(ts)$/,
          exclude: [/node_modules/],
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-typescript"],
            },
          },
        },
      ],
    },
    experiments: {
      topLevelAwait: true,
    },
    plugins: [createDefinitions(params)],
  };
}
