import type { Configuration } from "webpack";
import { DefinePlugin, optimize } from "webpack";
import path from "path";
import TerserPlugin from "terser-webpack-plugin";
import { config } from "dotenv";
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";

config();

type DevConfig = {
  port: number;
  enableHmr: boolean;
  enableHttps: boolean;
  appOrigin?: string;
};

export function buildConfig({
  devConfig,
  appEntry = path.join(process.cwd(), "src", "index.tsx"),
  backendHost = process.env.CANVA_BACKEND_HOST,
  canupApiUrl = process.env.CANUP_API_URL,
}: {
  devConfig?: DevConfig;
  appEntry?: string;
  backendHost?: string;
  canupApiUrl?: string;
} = {}): Configuration & { devServer?: DevServerConfiguration } {
  const mode = devConfig ? "development" : "production";

  return {
    mode,
    context: path.resolve(process.cwd(), "./"),
    entry: {
      app: appEntry,
    },
    target: "web",
    resolve: {
      // Prevent duplicate modules from file: protocol dependencies
      modules: [path.resolve(process.cwd(), "node_modules"), "node_modules"],
      alias: {
        // Point at canup TypeScript source for immediate dev feedback
        "canup": path.resolve(__dirname, "../../src/ui/index.ts"),
        styles: path.resolve(process.cwd(), "src/styles"),
      },
      extensions: [".ts", ".tsx", ".js", ".css"],
      // Map .js imports to .ts/.tsx (canup uses .js extensions in imports)
      extensionAlias: { ".js": [".ts", ".tsx", ".js"] },
    },
    infrastructureLogging: {
      level: "none",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          // Allow canup source through ts-loader
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: { transpileOnly: true },
            },
          ],
        },
        {
          // CSS from node_modules (Canva UI Kit styles)
          test: /\.css$/,
          include: /node_modules/,
          use: ["style-loader", "css-loader"],
        },
        {
          // CSS from app source (CSS Modules)
          test: /\.css$/,
          exclude: /node_modules/,
          use: [
            "style-loader",
            { loader: "css-loader", options: { modules: true } },
          ],
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: { format: { ascii_only: true } },
        }),
      ],
    },
    output: {
      filename: "[name].js",
      path: path.resolve(process.cwd(), "dist"),
      clean: true,
    },
    plugins: [
      new DefinePlugin({
        BACKEND_HOST: JSON.stringify(backendHost),
        CANUP_API_URL: JSON.stringify(canupApiUrl),
      }),
      // Canva apps must submit a single JS file
      new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    ],
    ...buildDevConfig(devConfig),
  };
}

function buildDevConfig(options?: DevConfig): {
  devtool?: string;
  devServer?: DevServerConfiguration;
} {
  if (!options) {
    return {};
  }

  const { port, enableHmr, appOrigin, enableHttps } = options;
  const host = "localhost";

  let devServer: DevServerConfiguration = {
    server: enableHttps ? "https" : "http",
    host,
    allowedHosts: [host],
    historyApiFallback: {
      rewrites: [{ from: /^\/$/, to: "/app.js" }],
    },
    port,
    client: {
      logging: "verbose",
    },
  };

  if (enableHmr && appOrigin) {
    devServer = {
      ...devServer,
      allowedHosts: [host, new URL(appOrigin).hostname],
      headers: {
        "Access-Control-Allow-Origin": appOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Private-Network": "true",
      },
    };
  } else {
    devServer.webSocketServer = false;
  }

  return {
    devtool: "source-map",
    devServer,
  };
}

// Default export for webpack-cli (production builds)
export default buildConfig();
