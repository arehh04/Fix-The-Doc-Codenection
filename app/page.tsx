"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🧠</span>
          <span>Smart-Doc AI</span>
        </div>
        <nav>
          <ul>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
            <li>
              <Link href="/ai">AI Tools</Link>
            </li>
          </ul>
        </nav>
        <div className={styles.authButtons}>
          <button className={`${styles.btn} ${styles.btnOutline}`}>
            Sign In
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            Sign Up
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <h1>Revolutionize Your Document Workflow</h1>
        <p>
          Smart-Doc AI uses advanced artificial intelligence to summarize,
          correct, suggest, and generate content—making your writing process
          smarter and more efficient.
        </p>
        <Link href="/ai">
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.heroBtn}`}
          >
            Get Started Free
          </button>
        </Link>
      </section>

      <>
        <section id="features" className={styles.featuresSection}>
          <h2>Powerful Features</h2>
          <div className={styles.features}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📄</div>
              <h3>AI Summarization</h3>
              <p>
                Transform lengthy documents into concise summaries with our
                advanced AI algorithms.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>✏</div>
              <h3>Smart Auto-Correct</h3>
              <p>
                Fix grammar and spelling errors instantly with context-aware
                corrections.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💡</div>
              <h3>AI Suggestions</h3>
              <p>
                Get intelligent writing suggestions to enhance your content and
                improve clarity.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🤖</div>
              <h3>Content Generation</h3>
              <p>
                Generate high-quality content from notes, comments, or code
                snippets.
              </p>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <p>
            © 2024 Smart-Doc AI. This is a prototype for competition submission.
          </p>
        </footer>
      </>
    </div>
  );
}
