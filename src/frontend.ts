import { PathLike } from "fs";
import { BuildType } from "./types/lib.js";
import webpack, { Configuration } from "webpack";
import ReactRefreshPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
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
    optimization: {
      runtimeChunk: true,
    },
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
          configFile: 'tsconfig.json',
          diagnosticOptions: {
            syntactic: true,
            semantic: true,
          }
        }
      })
    ],
  };

  if (params.buildType === "production" || params.buildType === "test") {
    frontendConfig.mode = "production";
    frontendConfig.devtool = false;
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
