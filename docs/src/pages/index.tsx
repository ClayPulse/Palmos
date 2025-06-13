import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";
import "material-icons/iconfont/material-icons.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header
      className={clsx("hero", styles.heroBanner)}
      style={{
        height: "100%",
        width: "100%",
      }}
    >
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>

        <div className="quickLinks">
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/guide"
            >
              Pulse Editor Guide
            </Link>
          </div>
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/api-reference"
            >
              API Reference
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "grid",
        gridTemplateRows: "max-content max-content auto max-content",
        overflowX: "hidden",
      }}
    >
      <Layout
        title={`Pulse Editor Documentation`}
        description="Your AI-powered creative companion that captures your vibe. Pulse Editor is a modular, cross-platform, AI-powered creative platform built to adapt to your ideas, no matter how you create."
        wrapperClassName="homepageWrapper"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <HomepageHeader />
        </div>
      </Layout>
    </div>
  );
}
