import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Pulse Editor Documentation",
  tagline:
    "A modular, cross-platform, AI-powered creative platform built to adapt to your ideas.",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://docs.pulse-editor.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "claypulse", // Usually your GitHub org/user name.
  projectName: "pulse-editor", // Usually your repo name.
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/ClayPulse/pulse-editor/tree/main/docs/",
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/ClayPulse/pulse-editor/tree/main/docs/",
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/pulse-editor-social-card.png",
    navbar: {
      title: "Pulse Editor",
      logo: {
        alt: "Pulse Editor Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          to: "/docs/guide",
          sidebarId: "guideSidebar",
          position: "left",
          label: "Guide",
        },
        { to: "/blog", label: "Blog", position: "left" },
        {
          to: "/docs/api-reference",
          sidebarId: "apiRefSidebar",
          label: "API Reference",
          position: "left",
        },
        {
          type: "docsVersionDropdown",
          position: "right",
          versions: {
            current: {
              label: "Latest",
            },
          },
        },
        {
          href: "https://pulse-editor.com",
          label: "Website",
          position: "right",
        },
        {
          href: "https://discord.com/invite/s6J54HFxQp",
          label: "Discord",
          position: "right",
        },
        {
          href: "https://github.com/ClayPulse/pulse-editor",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Section",
          items: [
            {
              label: "Guide",
              to: "/docs/guide",
            },
            {
              label: "Blog",
              to: "/blog",
            },
            {
              label: "API Reference",
              to: "/docs/api-reference",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              href: "https://discord.com/invite/s6J54HFxQp",
            },
            {
              label: "GitHub",
              href: "https://github.com/ClayPulse/pulse-editor",
            },
          ],
        },
        {
          title: "Website",
          items: [
            {
              label: "Pulse Editor",
              href: "https://pulse-editor.com",
            },
            {
              label: "Marketplace",
              href: "https://pulse-editor.com/marketplace",
            },
          ],
        },
      ],
      copyright: `ClayPulse AI © ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
