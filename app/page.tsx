"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type UploadedDocType = "notes" | "psq" | "reference";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UploadedDoc {
  id: string;
  name: string;
  type: UploadedDocType;
  content: string;
}

export default function MathStudyBuddy() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [docType, setDocType] = useState<UploadedDocType>("notes");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [ragPreview, setRagPreview] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const parseFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const parsedDocs: UploadedDoc[] = [];

    for (const file of files) {
      const text = await parseFileAsText(file);
      parsedDocs.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: docType,
        content: text,
      });
    }

    setUploadedDocs((prev) => [...prev, ...parsedDocs]);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Uploaded ${parsedDocs.length} file(s) as ${docType.toUpperCase()}. I will use these for retrieval in your next math question.`,
        timestamp: new Date(),
      },
    ]);

    e.target.value = "";
  };

  const removeDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          uploadedDocs,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        },
      ]);
      setRagPreview(data.ragContextUsed || "");
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I hit an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setRagPreview("");
  };

  const prompts = [
    "Solve: If 2x + 5 = 17, what is x?",
    "Explain chain rule with one worked example.",
    "From my PSQ, give me a 30-minute revision plan.",
    "Turn these notes into a concise formula sheet.",
  ];

  return (
    <div className={styles.container}>
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <button onClick={clearChat} className={styles.newChatButton}>
            <span className={styles.plusIcon}>↺</span> Reset Chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className={styles.closeSidebarButton}>
            ✕
          </button>
        </div>

        <div className={styles.chatHistory}>
          <h3>Knowledge Base</h3>
          <p className={styles.sessionTime}>Upload notes, PSQ, and references for RAG.</p>
          {uploadedDocs.map((doc) => (
            <div key={doc.id} className={styles.chatSession}>
              <span className={styles.sessionIcon}>📄</span>
              <div className={styles.sessionInfo}>
                <span className={styles.sessionTitle}>{doc.name}</span>
                <span className={styles.sessionTime}>{doc.type.toUpperCase()}</span>
              </div>
              <button onClick={() => removeDoc(doc.id)} className={styles.removeDocButton}>✕</button>
            </div>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.fileUploadArea}>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as UploadedDocType)}
              className={styles.docTypeSelect}
            >
              <option value="notes">Notes</option>
              <option value="psq">PSQ</option>
              <option value="reference">Reference</option>
            </select>
            <label htmlFor="file-upload" className={styles.uploadLabel}>
              <span className={styles.uploadIcon}>📤</span> Upload Files
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".txt,.md,.csv"
              onChange={handleFileUpload}
              className={styles.fileInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <header className={styles.header}>
          <button onClick={() => setSidebarOpen(true)} className={styles.menuButton}>
            ☰
          </button>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>📘</span>
            <span>Math Study Buddy</span>
          </div>
          <button onClick={clearChat} className={styles.clearButton} disabled={messages.length === 0}>
            🗑 Clear
          </button>
        </header>

        <main className={styles.main}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>🧮</div>
              <h1>Math Study Buddy (RAG + CoT + SFT)</h1>
              <p>Upload notes/PSQ files, then ask math questions for grounded, stepwise support.</p>
              <div className={styles.examples}>
                <h3>Try asking:</h3>
                <div className={styles.exampleGrid}>
                  {prompts.map((prompt) => (
                    <button key={prompt} onClick={() => setInput(prompt)} className={styles.exampleButton}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.chatContainer}>
              {messages.map((message) => (
                <div key={message.id} className={`${styles.message} ${styles[message.role]}`}>
                  <div className={styles.messageAvatar}>{message.role === "user" ? "👤" : "🤖"}</div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>{message.content}</div>
                    <div className={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className={`${styles.message} ${styles.assistant}`}>
                  <div className={styles.messageAvatar}>🤖</div>
                  <div className={styles.messageContent}>Math Study Buddy is reasoning...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <div className={styles.inputContainer}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a math question or request a revision plan..."
                className={styles.input}
              />
              <button type="submit" disabled={!input.trim() || isLoading} className={styles.sendButton}>
                {isLoading ? "⏳" : "🚀"}
              </button>
            </div>
            <div className={styles.helpText}>
              <p>{uploadedDocs.length} uploaded sources • Notes + PSQ retrieval enabled</p>
            </div>
            {ragPreview && <pre className={styles.ragPreview}>{ragPreview}</pre>}
          </form>
        </footer>
      </div>

      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}
