"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");

  const features = [
    {
      id: "summarize",
      title: "Summarization",
      icon: "📄",
      description:
        "Transform lengthy documents into concise summaries with our advanced AI algorithms.",
    },
    {
      id: "autocorrect",
      title: "Smart Auto-Correct",
      icon: "✏",
      description:
        "Fix grammar and spelling errors instantly with context-aware corrections.",
    },
    {
      id: "suggest",
      title: "Suggestions",
      icon: "💡",
      description:
        "Get intelligent writing suggestions to enhance your content and improve clarity.",
    },
    {
      id: "generate",
      title: "Content Generation",
      icon: "🤖",
      description:
        "Generate high-quality content from notes, comments, or code snippets.",
    },
  ];

  const handleFeatureClick = async (featureId: string) => {
    if (!inputText.trim()) {
      alert("Please enter some text first");
      return;
    }

    setIsLoading(true);
    setActiveFeature(featureId);
    setOutputText("");

    try {
      const response = await fetch("/api/simulate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feature: featureId, text: inputText }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      if (data.success) {
        setOutputText(data.result);
      }
    } catch (error) {
      console.error("Error:", error);
      setOutputText("An error occurred while processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

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
              <a href="#demo">Try It</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
          </ul>
        </nav>
        <div className={styles.authButtons}>
          {/* FIXED: Removed incorrect ${} syntax */}
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
          DocMind AI uses advanced artificial intelligence to summarize,
          correct, suggest, and generate content—making your writing process
          smarter and more efficient.
        </p>
        <button
          className={`${styles.btn} ${styles.btnPrimary} ${styles.heroBtn}`}
        >
          Get Started
        </button>
      </section>

      <section id="features" className={styles.featuresSection}>
        <h2>Features Includes</h2>
        <div className={styles.features}>
          {features.map((feature) => (
            <div key={feature.id} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className={styles.demoSection}>
        <h2>Experience Smart-Doc AI</h2>
        <div className={styles.inputArea}>
          <textarea
            placeholder="Enter your text here... (e.g., document, notes, code comments)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className={styles.textarea}
          ></textarea>
        </div>

        <div className={styles.tools}>
          {features.map((feature) => (
            <button
              key={feature.id}
              className={`${styles.toolBtn} ${
                activeFeature === feature.id ? styles.active : ""
              }`}
              onClick={() => handleFeatureClick(feature.id)}
              disabled={isLoading}
            >
              <span className={styles.toolIcon}>{feature.icon}</span>
              <span>{feature.title}</span>
            </button>
          ))}
        </div>

        <div className={styles.outputArea}>
          <h3>AI Output:</h3>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Processing with AI...</span>
            </div>
          ) : (
            <div className={styles.outputContent}>
              {outputText || "Select a feature to see the AI in action!"}
            </div>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 DocMind AI. Own by NAK4S.</p>
      </footer>
    </div>
  );
}
