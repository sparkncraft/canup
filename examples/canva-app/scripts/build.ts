/**
 * Production build script.
 *
 * Uses tsx (not webpack-cli) to match the start script pattern
 * and avoid needing ts-node as a dependency.
 */
import webpack from 'webpack';
import { buildConfig } from '../webpack.config';

const config = buildConfig();
const compiler = webpack(config);

compiler.run((err, stats) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  if (stats) {
    console.log(stats.toString({ colors: true, modules: false }));
    if (stats.hasErrors()) {
      process.exit(1);
    }
  }
  compiler.close(() => {});
});
