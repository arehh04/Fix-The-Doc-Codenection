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

export default function AIAssistant() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Sample conversation starter prompts
  const conversationStarters = [
    "Help me write a story",
    "Explain this like I'm 10 years old",
    "Summarize this document for me",
    "Check my writing for mistakes",
    "Create a recipe from these ingredients",
    "Help with homework question",
    "Write a friendly email",
    "Tell me a fun fact",
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      // Add file notification to chat
      const fileMessage: Message = {
        id: Date.now().toString(),
        text: `I've attached ${files.length} file(s): ${files
          .map((f) => f.name)
          .join(", ")}`,
        sender: "user",
        timestamp: new Date(),
        files: files,
      };
      setMessages((prev) => [...prev, fileMessage]);
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
    // Add removal notification to chat
    const removeMessage: Message = {
      id: Date.now().toString(),
      text: `I've removed the file: ${fileName}`,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, removeMessage]);
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

    const currentInput = inputText;

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
          text: currentInput,
          fileNames: selectedFiles.map((f) => f.name),
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
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStarter = (starter: string) => {
    setInputText(starter);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setSelectedFiles([]);
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
          <span className={styles.logoIcon}>💬</span>
          <span>Friendly AI Assistant</span>
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
          <h1>Your Friendly AI Helper</h1>
          <p className={styles.subtitle}>
            Ask me anything - I can help with writing, questions, files, and
            more!
          </p>

          {/* Conversation Starters */}
          <div className={styles.startersSection}>
            <h2>Need inspiration? Try these:</h2>
            <div className={styles.startersGrid}>
              {conversationStarters.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickStarter(starter)}
                  className={styles.starterButton}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Container */}
          <div className={styles.chatContainer} ref={chatContainerRef}>
            {messages.length === 0 ? (
              <div className={styles.welcomeMessage}>
                <div className={styles.welcomeAvatar}>🤖</div>
                <h3>Hello! I'm your friendly AI assistant</h3>
                <p>I can help you with:</p>
                <ul>
                  <li>📝 Writing and editing</li>
                  <li>📄 Document summarization</li>
                  <li>❓ Answering questions</li>
                  <li>📁 File analysis</li>
                  <li>🎓 Homework help</li>
                  <li>💡 Creative ideas</li>
                </ul>
                <p>
                  Just type your message below or try one of the suggestions
                  above!
                </p>
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
                  <div className={styles.messageAvatar}>
                    {message.sender === "user" ? "👤" : "🤖"}
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>{message.text}</div>
                    {message.files && message.files.length > 0 && (
                      <div className={styles.messageFiles}>
                        <strong>Attached files:</strong>
                        {message.files.map((file) => (
                          <span key={file.name} className={styles.fileTag}>
                            📄 {file.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className={styles.aiMessage}>
                <div className={styles.messageAvatar}>🤖</div>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span>Thinking</span>
                    <div className={styles.typingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className={styles.selectedFiles}>
              <h3>Files ready to send:</h3>
              <div className={styles.filesList}>
                {selectedFiles.map((file) => (
                  <div key={file.name} className={styles.fileItem}>
                    <span className={styles.fileIcon}>📄</span>
                    <span className={styles.fileName}>{file.name}</span>
                    <button
                      onClick={() => removeFile(file.name)}
                      className={styles.removeFileBtn}
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unified Input Area */}
          <div className={styles.inputSection}>
            <div className={styles.inputContainer}>
              <div className={styles.inputBox}>
                <textarea
                  placeholder="Type your message here... You can ask questions, share files, or request help with anything!"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={styles.textarea}
                  rows={2}
                />

                <div className={styles.inputActions}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className={styles.fileInput}
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
                      title="Start new conversation"
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
                    {isLoading ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.helpText}>
              <p>
                💡 <strong>Tip:</strong> You can attach files, ask questions, or
                request help with writing!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
