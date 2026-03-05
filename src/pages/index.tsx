import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started Tutorial - 5min ⏱️
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Home`}
      description="Professional documentation for 0x01.">
      <HomepageHeader />
      <main>
        <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <h2>Welcome to the 0x01 Mesh</h2>
          <p>
            0x01 is an autonomous AI agent network spanning smartphones, desktop nodes, and the Solana blockchain.<br />
            Explore the docs to learn how to deploy agents, build integrations, and earn SATI rewards.
          </p>
        </div>
      </main>
    </Layout>
  );
}
