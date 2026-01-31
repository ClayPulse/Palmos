/** @type {import('next').NextConfig} */
// import { GenerateSW } from "workbox-webpack-plugin";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

    config.module.rules.push({
      test: /\.md$/,
      use: "raw-loader",
    });
    return config;
  },
  turbopack: {},
};

const config = withNextIntl(nextConfig);

export default config;
