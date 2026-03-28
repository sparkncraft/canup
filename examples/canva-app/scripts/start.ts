/**
 * Start script for local development.
 *
 * Uses tsx (not webpack-cli) to avoid CJS/ESM interop issues when loading
 * webpack.config.ts. Mirrors the pattern from the official Canva starter kit.
 */
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import chalk from 'chalk';
import { config } from 'dotenv';
import { buildConfig } from '../webpack.config';

config();

const port = Number(process.env.CANVA_FRONTEND_PORT) || 8080;
const enableHmr = process.env.CANVA_HMR_ENABLED?.toUpperCase() === 'TRUE';
const enableHttps = true; // Required: Canva editor runs on HTTPS
const appOrigin = process.env.CANVA_APP_ORIGIN;

if (!appOrigin) {
  console.warn(
    chalk.yellow.bold('CANVA_APP_ORIGIN is not set.'),
    'HMR will be disabled. Set it in .env from Developer Portal -> Settings -> Security.',
  );
}

const webpackConfig = buildConfig({
  devConfig: { port, enableHmr, enableHttps, appOrigin },
});

const compiler = webpack(webpackConfig);
// devServer is always present when devConfig is passed to buildConfig
const server = new WebpackDevServer(webpackConfig.devServer!, compiler);

void server.start().then(() => {
  const protocol = enableHttps ? 'https' : 'http';
  console.log();
  console.log(chalk.green.bold('Canva app dev server running:'));
  console.log(`  ${protocol}://localhost:${port}`);
  console.log();
  if (enableHmr && appOrigin) {
    console.log(chalk.cyan('HMR enabled') + ` for ${appOrigin}`);
  } else {
    console.log(chalk.dim('HMR disabled (set CANVA_HMR_ENABLED=TRUE and CANVA_APP_ORIGIN)'));
  }
  console.log();
});
