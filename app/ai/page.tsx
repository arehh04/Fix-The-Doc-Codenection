"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function AITools() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");
  const [uploadOption, setUploadOption] = useState<
    "text" | "file" | "drive" | "link"
  >("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const features = [
    {
      id: "summarize",
      title: "AI Summarization",
      icon: "📄",
      description: "Transform lengthy documents into concise summaries",
    },
    {
      id: "autocorrect",
      title: "Smart Auto-Correct",
      icon: "✏",
      description: "Fix grammar and spelling errors",
    },
    {
      id: "suggest",
      title: "AI Suggestions",
      icon: "💡",
      description: "Get intelligent writing suggestions",
    },
    {
      id: "generate",
      title: "Content Generation",
      icon: "🤖",
      description: "Generate high-quality content",
    },
  ];

  const handleFeatureClick = async (featureId: string) => {
    if (!inputText.trim() && uploadOption === "text") {
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
        body: JSON.stringify({
          feature: featureId,
          text: inputText,
          uploadType: uploadOption,
        }),
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Here you would read the file content and set it to inputText
      const reader = new FileReader();
      reader.onload = (e) => {
        setInputText(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🧠</span>
          <span>Smart-Doc AI</span>
        </Link>
        <nav>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#about">About</a>
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

      <main className={styles.main}>
        <div className={styles.aiContainer}>
          <h1>AI-Powered Document Tools</h1>
          <p className={styles.subtitle}>
            Choose how you want to provide your content
          </p>

          {/* Upload Options Toggle */}
          <div className={styles.uploadOptions}>
            <button
              className={`${styles.uploadOption} ${
                uploadOption === "text" ? styles.active : ""
              }`}
              onClick={() => setUploadOption("text")}
            >
              📝 Direct Text
            </button>
            <button
              className={`${styles.uploadOption} ${
                uploadOption === "file" ? styles.active : ""
              }`}
              onClick={() => setUploadOption("file")}
            >
              📁 Upload File
            </button>
            <button
              className={`${styles.uploadOption} ${
                uploadOption === "drive" ? styles.active : ""
              }`}
              onClick={() => setUploadOption("drive")}
            >
              ☁ Google Drive
            </button>
            <button
              className={`${styles.uploadOption} ${
                uploadOption === "link" ? styles.active : ""
              }`}
              onClick={() => setUploadOption("link")}
            >
              🔗 Web Link
            </button>
          </div>

          {/* Content Input Area */}
          <div className={styles.inputSection}>
            {uploadOption === "text" && (
              <div className={styles.textInput}>
                <textarea
                  placeholder="Type or paste your text here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={styles.textarea}
                  rows={8}
                />
              </div>
            )}

            {uploadOption === "file" && (
              <div className={styles.fileUpload}>
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileUpload}
                  className={styles.fileInput}
                  accept=".txt,.doc,.docx,.pdf"
                />
                <label htmlFor="file-upload" className={styles.fileLabel}>
                  📎 Choose File
                </label>
                {selectedFile && (
                  <p className={styles.fileInfo}>
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            )}

            {uploadOption === "drive" && (
              <div className={styles.driveUpload}>
                <button className={`${styles.btn} ${styles.btnOutline}`}>
                  🔗 Connect Google Drive
                </button>
                <p className={styles.helpText}>
                  Connect your Google Drive to access documents
                </p>
              </div>
            )}

            {uploadOption === "link" && (
              <div className={styles.linkInput}>
                <input
                  type="url"
                  placeholder="Paste website URL here..."
                  className={styles.urlInput}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button className={`${styles.btn} ${styles.btnPrimary}`}>
                  📥 Fetch Content
                </button>
              </div>
            )}
          </div>

          {/* AI Tools */}
          <div className={styles.toolsSection}>
            <h2>Select AI Tool</h2>
            <div className={styles.toolsGrid}>
              {features.map((feature) => (
                <button
                  key={feature.id}
                  className={`${styles.toolButton} ${
                    activeFeature === feature.id ? styles.active : ""
                  }`}
                  onClick={() => handleFeatureClick(feature.id)}
                  disabled={isLoading}
                >
                  <span className={styles.toolIcon}>{feature.icon}</span>
                  <span className={styles.toolTitle}>{feature.title}</span>
                  <span className={styles.toolDesc}>{feature.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Output Area */}
          <div className={styles.outputSection}>
            <h2>AI Output</h2>
            <div className={styles.outputArea}>
              {isLoading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <span>Processing with AI...</span>
                </div>
              ) : (
                <div className={styles.outputContent}>
                  {outputText || "Select an AI tool to see the results here"}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          © 2024 Smart-Doc AI. This is a prototype for competition submission.
        </p>
      </footer>
    </div>
  );
}
