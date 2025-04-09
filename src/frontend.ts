import { PathLike } from "fs";
import { BuildType } from "./types/lib.js";
import webpack, { Configuration } from "webpack";
import ReactRefreshPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import path from "path";

export interface FrontendOptions {
  name: string;
  entry: PathLike;
  buildType: BuildType;
  aliases: Record<string, PathLike>;
  output: PathLike;
}

function createDefinitions(buildType: BuildType): webpack.DefinePlugin {
  const definitions = {
    __DEVELOPMENT__: buildType === "development",
    __TEST__: buildType === "test",
    __TEST_JEST__: false,
    __PRODUCTION__: buildType === "production",
  };
  return new webpack.DefinePlugin(definitions);
}

export function composeEntry(
  entry: PathLike,
  publicPath: string,
  buildType: BuildType,
): { main: string[] } {
  const result: string[] = [];

  result.push(entry.toString());

  if (buildType === "development") {
    result.push(
      `webpack-hot-middleware/client?path=${publicPath}__webpack_hmr&reload=false&timeout=20000`,
    );
  }

  return {
    main: result,
  };
}

export default function createFrontendConfig(
  params: FrontendOptions,
): Configuration {
  let publicPath = "/";

  const frontendConfig: Configuration = {
    watchOptions: {
      ignored: ["**/node_modules", "**/.git", "**/*.test.*"],
      aggregateTimeout: 300,
    },
    target: "web",
    name: params.name,
    entry: composeEntry(params.entry, publicPath, params.buildType),
    mode: params.buildType === "development" ? "development" : "production",
    output: {
      filename: "[name].[contenthash].js",
      path: params.output as string,
      publicPath,
    },
    stats: "minimal",
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      alias: params.aliases as Record<string, string>,
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules\/(?!(core-js|@babel))/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: { browsers: "defaults" },
                    useBuiltIns: "entry",
                    corejs: 3,
                  },
                ],
                ["@babel/preset-react", { runtime: "automatic" }],
                "@babel/preset-typescript",
              ],
            },
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(
          path.dirname(params.entry.toString()),
          "index.html",
        ),
        filename: "index.html",
        inject: "body",
      }),
      createDefinitions(params.buildType),
      new ForkTsCheckerWebpackPlugin({
        async: false,
        typescript: {
          configFile: "tsconfig.json",
          diagnosticOptions: {
            syntactic: true,
            semantic: true,
          },
        },
      }),
    ],
  };

  const isProduction = params.buildType === "production";
  const isTest = params.buildType === "test";
  if (isProduction || isTest) {
    frontendConfig.optimization = {};
    frontendConfig.optimization.minimize = true;
    frontendConfig.optimization.minimizer = [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction, // removal of console.log
            drop_debugger: isProduction, // removal of debugger
            dead_code: true, // removal of dead code
            conditionals: true, // removal of dead branches
            unused: isProduction, // removal of unused variables
          },
          output: {
            comments: isProduction, // removal of comments
          },
        },
        extractComments: false, // disable comments extraction
      }),
    ];
    frontendConfig.optimization.splitChunks = {
      chunks: "all", // split chunks for all types of modules
    };
    frontendConfig.optimization.runtimeChunk = {
      name: "runtime", // create a separate chunk for the runtime
    };
    frontendConfig.optimization.usedExports = true; // mark used exports
    frontendConfig.optimization.sideEffects = true; // mark side effects
    frontendConfig.optimization.concatenateModules = true; // enable module concatenation
    frontendConfig.mode = "production";
  }

  if (isProduction) {
    frontendConfig.devtool = false;
  } else if (isTest) {
    frontendConfig.devtool = "source-map";
  } else {
    frontendConfig.mode = "development";
    frontendConfig.devtool = "source-map";

    if (frontendConfig.plugins == null) return frontendConfig;

    frontendConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
    frontendConfig.plugins.push(
      new ReactRefreshPlugin({
        esModule: true,
        overlay: {
          sockIntegration: "whm",
        },
      }),
    );
  }

  return frontendConfig;
}
