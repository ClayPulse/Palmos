/** @type {import('next').NextConfig} */
// import { GenerateSW } from "workbox-webpack-plugin";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  distDir: "../build/next",
  webpack: (config: any) => {
    // Add external configuration
    config.externals = [...config.externals, { canvas: "canvas" }]; // required to make Konva & react-konva work

    config.resolve.extensions.push(".ts", ".tsx");
    config.resolve.fallback = { fs: false };

    config.ignoreWarnings = [
      {
        message:
          /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
    ];

    config.plugins.push();
    // new GenerateSW({
    //   // Configurations specific to your Module Federation setup
    //   // these options encourage the ServiceWorkers to get in there fast
    //   // and not allow any straggling "old" SWs to hang around
    //   clientsClaim: true,
    //   skipWaiting: true,
    // }),

    config.module.rules.push({
      test: /\.md$/,
      use: "raw-loader",
    });
    return config;
  },
  turbopack: {},
};

export default withNextIntl(nextConfig);
