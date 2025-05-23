import { Logger } from "pino";
import koa from "koa";
import koaMiddleware from "koa-connect";
import history from "connect-history-api-fallback";
import devMiddlewareWrapper from "./dev-request-wrapper.js";
import { parseConfiguration } from "../parse-config.js";
import { liknurWebpackDev } from "../webpack-config.js";
import chalk from "chalk";

export async function frontendHotMiddleware(
  app: koa,
  domain: string,
  logger: Logger,
  liknurConfigFile: string,
  frontendServices: ReadonlyArray<string>,
): Promise<void> {
  logger.info(
    "Starting frontend hot middleware using proect config file:" +
      chalk.bold(liknurConfigFile),
  );
  // eslint-disable-next-line
  app.use(koaMiddleware(history() as unknown as any));

  const parseResult = await parseConfiguration(liknurConfigFile);

  if (!parseResult.success) {
    logger.error(parseResult.errors);
    throw new Error("Failed to parse configuration");
  }
  const liknurConfig = parseResult.data;

  app.use(
    devMiddlewareWrapper(
      await liknurWebpackDev(liknurConfig, frontendServices),
      frontendServices,
      domain,
      logger,
    ),
  );
}
