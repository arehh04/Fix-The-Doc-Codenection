"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  type: "chat" | "doc" | "summary" | "suggestion";
  files?: File[];
}

export default function AITools() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<
    "chat" | "doc" | "summary" | "suggestion"
  >("chat");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const writingModes = [
    {
      id: "chat",
      title: "AI Assistant",
      icon: "💬",
      description: "Chat and get answers about your code",
    },
    {
      id: "doc",
      title: "Documentation",
      icon: "📄",
      description: "Generate docs from code/comments",
    },
    {
      id: "summary",
      title: "Summarization",
      icon: "📋",
      description: "TL;DR for long documents",
    },
    {
      id: "suggestion",
      title: "Writing Aid",
      icon: "✏",
      description: "Real-time writing suggestions",
    },
  ];

  const quickPrompts = {
    doc: [
      "Generate README from this code",
      "Create API documentation",
      "Extract comments into docs",
      "Generate function documentation",
    ],
    summary: [
      "Summarize this codebase",
      "TL;DR for this document",
      "Extract key points",
      "Create executive summary",
    ],
    suggestion: [
      "Improve this writing",
      "Check markdown formatting",
      "Suggest better structure",
      "Grammar and style check",
    ],
    chat: [
      "Explain this code",
      "What does this function do?",
      "Suggest improvements",
      "Generate examples",
    ],
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      // Auto-analyze code files
      if (
        files.some((f) => f.name.match(/\.(js|ts|py|java|cpp|rb|go|rs|php)$/))
      ) {
        setActiveMode("doc");
        setTimeout(() => {
          setInputText(
            (prev) => prev + "\nCan you generate documentation for this code?"
          );
        }, 100);
      }
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      type: activeMode,
      files: [...selectedFiles],
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentInput = inputText;
    const currentFiles = [...selectedFiles];

    setInputText("");
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      // Read file contents if any
      let filesContentStr = "";
      if (currentFiles.length > 0) {
        for (const file of currentFiles) {
          const content = await readFileContent(file);
          filesContentStr += `\n\n--- FILE: ${file.name} ---\n${content}`;
        }
      }

      const fullPrompt = `${currentInput}${filesContentStr}`;

      const response = await fetch("/api/simulate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: activeMode,
          text: fullPrompt,
          fileNames: currentFiles.map((f) => f.name),
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.result,
        sender: "ai",
        timestamp: new Date(),
        type: activeMode,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "An error occurred while processing your request.",
        sender: "ai",
        timestamp: new Date(),
        type: activeMode,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsText(file);
    });
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>📝</span>
          <span>SmartWrite AI</span>
        </Link>
        <nav>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.aiContainer}>
          <h1>AI Writing Assistant for Developers</h1>
          <p className={styles.subtitle}>
            Generate docs from code, summarize content, and get writing help
          </p>

          {/* Writing Modes */}
          <div className={styles.modesSection}>
            <h2>Writing Modes</h2>
            <div className={styles.modesGrid}>
              {writingModes.map((mode) => (
                <button
                  key={mode.id}
                  className={`${styles.modeButton} ${
                    activeMode === mode.id ? styles.active : ""
                  }`}
                  onClick={() => setActiveMode(mode.id as any)}
                >
                  <span className={styles.modeIcon}>{mode.icon}</span>
                  <span className={styles.modeTitle}>{mode.title}</span>
                  <span className={styles.modeDesc}>{mode.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Prompts */}
          <div className={styles.quickPromptsSection}>
            <h3>Quick Start</h3>
            <div className={styles.quickPrompts}>
              {quickPrompts[activeMode].map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt)}
                  className={styles.quickPromptButton}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload Area */}
          <div className={styles.uploadSection}>
            <div className={styles.uploadArea}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className={styles.fileInput}
                accept=".js,.ts,.py,.java,.cpp,.rb,.go,.rs,.php,.md,.txt,.json,.yaml,.yml,.html,.css"
                multiple
              />
              <div
                className={styles.uploadBox}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={styles.uploadIcon}>📁</div>
                <p>Drop code files here or click to browse</p>
                <small>
                  Supports: .js, .ts, .py, .java, .cpp, .rb, .go, .rs, .php, .md
                </small>
              </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className={styles.selectedFiles}>
                <h4>Selected Files:</h4>
                {selectedFiles.map((file) => (
                  <div key={file.name} className={styles.fileItem}>
                    <span className={styles.fileIcon}>📄</span>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={() => removeFile(file.name)}
                      className={styles.removeFileBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Container */}
          <div className={styles.chatContainer} ref={chatContainerRef}>
            {messages.length === 0 ? (
              <div className={styles.welcomeMessage}>
                <h3>🚀 Supercharge Your Writing Workflow</h3>
                <div className={styles.featureGrid}>
                  <div className={styles.featureItem}>
                    <span className={styles.featureIcon}>🤖</span>
                    <h4>AI Documentation</h4>
                    <p>Generate docs from code and comments</p>
                  </div>
                  <div className={styles.featureItem}>
                    <span className={styles.featureIcon}>📋</span>
                    <h4>Smart Summarization</h4>
                    <p>TL;DR for long documents and codebases</p>
                  </div>
                  <div className={styles.featureItem}>
                    <span className={styles.featureIcon}>✏</span>
                    <h4>Writing Assistant</h4>
                    <p>Real-time suggestions and markdown validation</p>
                  </div>
                  <div className={styles.featureItem}>
                    <span className={styles.featureIcon}>💬</span>
                    <h4>Q&A Chat</h4>
                    <p>Ask questions about your code and docs</p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.message} ${
                    message.sender === "user"
                      ? styles.userMessage
                      : styles.aiMessage
                  } ${styles[message.type]}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.sender}>
                      {message.sender === "user" ? "You" : "AI Assistant"}
                    </span>
                    <span className={styles.messageType}>
                      {message.type.toUpperCase()}
                    </span>
                    <span className={styles.timestamp}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    <pre>{message.text}</pre>
                    {message.files && message.files.length > 0 && (
                      <div className={styles.messageFiles}>
                        <strong>Files analyzed:</strong>
                        {message.files.map((file) => (
                          <span key={file.name} className={styles.fileTag}>
                            📄 {file.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className={`${styles.aiMessage} ${styles[activeMode]}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>AI Assistant</span>
                  <span className={styles.messageType}>
                    {activeMode.toUpperCase()}
                  </span>
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span>Analyzing</span>
                    <span className={styles.typingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={styles.inputSection}>
            <div className={styles.inputContainer}>
              <textarea
                placeholder={
                  activeMode === "doc"
                    ? "Describe what documentation you need or paste code comments..."
                    : activeMode === "summary"
                    ? "What would you like summarized? Paste text or describe..."
                    : activeMode === "suggestion"
                    ? "Paste text for writing suggestions or markdown validation..."
                    : "Ask a question about your code or documentation..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                className={styles.textarea}
                rows={3}
              />

              <div className={styles.inputActions}>
                <button
                  onClick={clearConversation}
                  className={styles.clearButton}
                  title="Clear conversation"
                  disabled={messages.length === 0}
                >
                  🗑 Clear
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={
                    isLoading ||
                    (!inputText.trim() && selectedFiles.length === 0)
                  }
                  className={styles.sendButton}
                >
                  {isLoading
                    ? "⏳ Processing..."
                    : `🚀 ${
                        activeMode === "doc"
                          ? "Generate Docs"
                          : activeMode === "summary"
                          ? "Summarize"
                          : activeMode === "suggestion"
                          ? "Analyze"
                          : "Send"
                      }`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
