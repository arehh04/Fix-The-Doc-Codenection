"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  fileAttached?: string;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
}

export default function DocumentAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    { id: "1", title: "New Document Analysis", timestamp: new Date() },
  ]);
  const [activeSession, setActiveSession] = useState<string>("1");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      // Add a system message about the uploaded file
      const fileMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `I've received your file "${file.name}". How would you like me to help with this document?`,
        timestamp: new Date(),
        fileAttached: file.name,
      };

      setMessages((prev) => [...prev, fileMessage]);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      fileAttached: fileName || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: "user", content: input },
          ],
          fileContent: fileContent || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setFileContent("");
    setFileName("");
  };

  const createNewChat = () => {
    const newId = (chatSessions.length + 1).toString();
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      timestamp: new Date(),
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveSession(newId);
    clearChat();
  };

  const documentExamples = [
    "Summarize the key points of this document",
    "Identify any grammatical errors in this text",
    "Rewrite this content to be more professional",
    "Convert this document to bullet points",
    "What's the main argument in this text?",
    "Suggest improvements for this document",
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <button onClick={createNewChat} className={styles.newChatButton}>
            + New Chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className={styles.closeSidebarButton}
          >
            ✕
          </button>
        </div>

        <div className={styles.chatHistory}>
          <h3>Chat History</h3>
          {chatSessions.map((session) => (
            <div
              key={session.id}
              className={`${styles.chatSession} ${
                activeSession === session.id ? styles.activeSession : ""
              }`}
              onClick={() => setActiveSession(session.id)}
            >
              <span className={styles.sessionTitle}>{session.title}</span>
              <span className={styles.sessionTime}>
                {session.timestamp.toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.fileUploadArea}>
            <label htmlFor="file-upload" className={styles.uploadLabel}>
              📎 Attach Document
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
              className={styles.fileInput}
              accept=".txt,.pdf,.doc,.docx,.md"
            />
            {fileName && (
              <div className={styles.fileName}>Attached: {fileName}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={styles.menuButton}
          >
            ☰
          </button>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>📄</span>
            <span>DocChat</span>
          </div>
          <button
            onClick={clearChat}
            className={styles.clearButton}
            disabled={messages.length === 0}
          >
            🗑 Clear
          </button>
        </header>

        {/* Main Chat Area */}
        <main className={styles.main}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>✨</div>
              <h1>Document Assistant</h1>
              <p>
                Upload a document or start chatting to get help with your
                documents
              </p>

              {/* Example prompts */}
              <div className={styles.examples}>
                <h3>Try asking:</h3>
                <div className={styles.exampleGrid}>
                  {documentExamples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(example)}
                      className={styles.exampleButton}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.chatContainer}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.message} ${styles[message.role]}`}
                >
                  <div className={styles.messageAvatar}>
                    {message.role === "user" ? "👤" : "🤖"}
                  </div>
                  <div className={styles.messageContent}>
                    {message.fileAttached && (
                      <div className={styles.fileIndicator}>
                        📎 {message.fileAttached}
                      </div>
                    )}
                    <div className={styles.messageText}>{message.content}</div>
                    <div className={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className={`${styles.message} ${styles.assistant}`}>
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <footer className={styles.footer}>
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <div className={styles.inputContainer}>
              <label
                htmlFor="file-upload-small"
                className={styles.attachButton}
              >
                📎
                <input
                  id="file-upload-small"
                  type="file"
                  onChange={handleFileUpload}
                  className={styles.fileInput}
                  accept=".txt,.pdf,.doc,.docx,.md"
                />
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message DocChat..."
                className={styles.input}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={styles.sendButton}
              >
                {isLoading ? "⏳" : "📤"}
              </button>
            </div>
            <div className={styles.helpText}>
              {fileName ? (
                <p>Working with: {fileName}</p>
              ) : (
                <p>
                  Ask about writing, editing, summarizing, or formatting
                  documents
                </p>
              )}
            </div>
          </form>
        </footer>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
