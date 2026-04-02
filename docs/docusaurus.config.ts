import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";
import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Palmos Documentation",
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
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

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
          docItemComponent: "@theme/ApiItem", // Derived from docusaurus-theme-openapi
          routeBasePath: "/",
          breadcrumbs: true,
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

  plugins: [
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "api", // plugin id
        docsPluginId: "classic", // configured for preset-classic
        config: {
          // petstore: {
          //   specPath: "openapi/petstore.yaml",
          //   outputDir: "docs/api-reference/app-server-functions/official-apps/petstore",
          //   sidebarOptions: {
          //     groupPathsBy: "tag",
          //     categoryLinkSource: "tag",
          //   },
          //   showSchemas: true,
          // } satisfies OpenApiPlugin.Options,
          vibeDevFlow: {
            specPath: "openapi/vibe-dev-flow.yaml",
            outputDir:
              "docs/api-reference/app-server-functions/official-apps/vibe-dev-flow",
            sidebarOptions: {
              groupPathsBy: "tag",
              categoryLinkSource: "tag",
            },
            showSchemas: true,
          } satisfies OpenApiPlugin.Options,
        },
      },
    ],
  ],

  themes: ["docusaurus-theme-openapi-docs"],

  themeConfig: {
    metadata: [
      {
        name: "keywords",
        content:
          "Palmos, AI, Vibe Coding, Documentation, API Reference",
      },
    ],

    // Replace with your project's social card
    image: "img/pulse-editor-social-card.png",
    navbar: {
      title: "Palmos Docs",
      logo: {
        alt: "Palmos Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          to: "/guide",
          sidebarId: "guideSidebar",
          position: "left",
          label: "Guide",
        },
        {
          to: "/api-reference",
          sidebarId: "apiRefSidebar",
          label: "API Reference",
          position: "left",
        },
        { to: "/blog", label: "Blog", position: "left" },
        {
          href: "https://web.pulse-editor.com",
          label: "Try App",
          position: "right",
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
              to: "/guide",
            },
            {
              label: "Blog",
              to: "/blog",
            },
            {
              label: "API Reference",
              to: "/api-reference",
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
              label: "Palmos",
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

    languageTabs: [
      {
        highlight: "bash",
        language: "curl",
        logoClass: "curl",
      },
      {
        highlight: "javascript",
        language: "javascript",
        logoClass: "javascript",
      },
      {
        highlight: "python",
        language: "python",
        logoClass: "python",
      },
      {
        highlight: "javascript",
        language: "nodejs",
        logoClass: "nodejs",
      },
      {
        highlight: "csharp",
        language: "csharp",
        logoClass: "csharp",
      },
      {
        highlight: "go",
        language: "go",
        logoClass: "go",
      },

      {
        highlight: "ruby",
        language: "ruby",
        logoClass: "ruby",
      },
      {
        highlight: "php",
        language: "php",
        logoClass: "php",
      },
      {
        highlight: "java",
        language: "java",
        logoClass: "java",
        variant: "unirest",
      },
      {
        highlight: "powershell",
        language: "powershell",
        logoClass: "powershell",
      },
      {
        highlight: "dart",
        language: "dart",
        logoClass: "dart",
      },
      {
        highlight: "c",
        language: "c",
        logoClass: "c",
      },
      {
        highlight: "objective-c",
        language: "objective-c",
        logoClass: "objective-c",
      },
      {
        highlight: "ocaml",
        language: "ocaml",
        logoClass: "ocaml",
      },
      {
        highlight: "r",
        language: "r",
        logoClass: "r",
      },
      {
        highlight: "swift",
        language: "swift",
        logoClass: "swift",
      },
      {
        highlight: "kotlin",
        language: "kotlin",
        logoClass: "kotlin",
      },
      {
        highlight: "rust",
        language: "rust",
        logoClass: "rust",
      },
    ],
  } satisfies Preset.ThemeConfig,
};

export default config;
