"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  files?: File[];
}

export default function AITools() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      id: "summarize",
      title: "AI Summarization",
      icon: "📄",
      description: "Transform documents into concise summaries",
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
    {
      id: "chat",
      title: "AI Chat",
      icon: "💬",
      description: "Chat with AI about your documents",
    },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      setInputText(
        (prev: string) =>
          prev + `\n[Attached: ${files.map((f: File) => f.name).join(", ")}]`
      );
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setInputText((prev) => prev.replace(`[Attached: ${fileName}]`, "").trim());
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      files: [...selectedFiles],
    };

    setMessages((prev) => [...prev, userMessage]);
    setConversationHistory((prev) => [...prev, inputText]);

    const currentInput = inputText;
    const currentFiles = [...selectedFiles];

    setInputText("");
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/simulate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature: activeFeature || "chat",
          text: currentInput,
          files: currentFiles.map((f) => f.name),
          conversationHistory,
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
      };

      setMessages((prev) => [...prev, aiMessage]);
      setConversationHistory((prev) => [...prev, data.result]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "An error occurred while processing your request.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const clearConversation = () => {
    setMessages([]);
    setConversationHistory([]);
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
          </ul>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.aiContainer}>
          <h1>Smart Document Assistant</h1>
          <p className={styles.subtitle}>
            Upload, chat, and transform your documents with AI
          </p>

          {/* AI Tools */}
          <div className={styles.toolsSection}>
            <h2>AI Tools</h2>
            <div className={styles.toolsGrid}>
              {features.map((feature) => (
                <button
                  key={feature.id}
                  className={`${styles.toolButton} ${
                    activeFeature === feature.id ? styles.active : ""
                  }`}
                  onClick={() => setActiveFeature(feature.id)}
                >
                  <span className={styles.toolIcon}>{feature.icon}</span>
                  <span className={styles.toolTitle}>{feature.title}</span>
                  <span className={styles.toolDesc}>{feature.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Container */}
          <div className={styles.chatContainer} ref={chatContainerRef}>
            {messages.length === 0 ? (
              <div className={styles.welcomeMessage}>
                <h3>👋 Welcome to Smart-Doc AI!</h3>
                <p>Start by:</p>
                <ul>
                  <li>📝 Typing a message below</li>
                  <li>📁 Uploading a document</li>
                  <li>🛠 Selecting an AI tool from above</li>
                </ul>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.message} ${
                    message.sender === "user"
                      ? styles.userMessage
                      : styles.aiMessage
                  }`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.sender}>
                      {message.sender === "user" ? "You" : "AI Assistant"}
                    </span>
                    <span className={styles.timestamp}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    <p>{message.text}</p>
                    {message.files && message.files.length > 0 && (
                      <div className={styles.messageFiles}>
                        <strong>Attachments:</strong>
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
              <div className={styles.aiMessage}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>AI Assistant</span>
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unified Input Area */}
          <div className={styles.inputSection}>
            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className={styles.selectedFiles}>
                <strong>Attached files:</strong>
                {selectedFiles.map((file) => (
                  <span key={file.name} className={styles.fileTag}>
                    📄 {file.name}
                    <button
                      onClick={() => removeFile(file.name)}
                      className={styles.removeFileBtn}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Text Input Area */}
            <div className={styles.inputContainer}>
              <textarea
                placeholder="Type your message, paste text, or describe what you want to do with your documents..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                className={styles.textarea}
                rows={3}
              />

              <div className={styles.inputActions}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                  accept=".txt,.doc,.docx,.pdf,.md"
                  multiple
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.attachButton}
                  title="Attach files"
                >
                  📎
                </button>

                {messages.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className={styles.clearButton}
                    title="Clear conversation"
                  >
                    🗑
                  </button>
                )}

                <button
                  onClick={handleSendMessage}
                  disabled={
                    isLoading ||
                    (!inputText.trim() && selectedFiles.length === 0)
                  }
                  className={styles.sendButton}
                >
                  {isLoading ? "⏳" : "🚀"} Send
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
              <span>Quick actions: </span>
              <button
                onClick={() => setInputText("Can you summarize this document?")}
              >
                Summarize
              </button>
              <button
                onClick={() =>
                  setInputText("Please check this for grammar errors:")
                }
              >
                Grammar Check
              </button>
              <button
                onClick={() =>
                  setInputText("Suggest improvements for this text:")
                }
              >
                Suggest Improvements
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
