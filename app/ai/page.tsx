'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  files?: File[];
  taskType?: string;
  reasoningSteps?: string[];
  similarContent?: string[];
}

export default function AIAssistant() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [taskType, setTaskType] = useState<string>('');
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [similarContent, setSimilarContent] = useState<string[]>([]);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [pineconeStats, setPineconeStats] = useState<any>(null);
  const [isManagingMemory, setIsManagingMemory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const conversationStarters = [
    "Tell me a fun fact!",
    "Help me write a story 📖",
    "Explain something like I'm 5",
    "Create a recipe with what I have 🍳",
    "Give me a random idea 💡",
    "Help with homework question 📚",
    "Write a friendly email 💌",
    "Tell me a joke! 😄"
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      const fileMessage: Message = {
        id: Date.now().toString(),
        text: 📎 Attached ${files.length} file(s): ${files.map(f => f.name).join(', ')},
        sender: 'user',
        timestamp: new Date(),
        files: files
      };
      setMessages(prev => [...prev, fileMessage]);
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    const removeMessage: Message = {
      id: Date.now().toString(),
      text: 🗑 Removed file: ${fileName},
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, removeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      files: [...selectedFiles]
    };

    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = inputText;
    const formData = new FormData();
    
    formData.append('input', currentInput);
    formData.append('conversationHistory', JSON.stringify(conversationHistory));
    
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    
    setInputText('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'ai',
          timestamp: new Date(),
          taskType: data.taskType,
          reasoningSteps: data.reasoningSteps,
          similarContent: data.similarContent
        };

        setMessages(prev => [...prev, aiMessage]);
        setConversationHistory(data.conversationHistory || []);
        setTaskType(data.taskType || '');
        setReasoningSteps(data.reasoningSteps || []);
        setSimilarContent(data.similarContent || []);
      } else {
        throw new Error(data.error);
      }
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Oops! Something went wrong. Please try again! 🔄',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStarter = (starter: string) => {
    setInputText(starter);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setSelectedFiles([]);
    setConversationHistory([]);
    setReasoningSteps([]);
    setSimilarContent([]);
  };

  const getPineconeStats = async () => {
    try {
      const formData = new FormData();
      formData.append('action', 'pinecone-stats');
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        setPineconeStats(data.stats);
      }
    } catch (error) {
      console.error('Error getting Pinecone stats:', error);
    }
  };

  const clearPineconeMemory = async () => {
    try {
      const formData = new FormData();
      formData.append('action', 'clear-pinecone');
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        setPineconeStats(null);
        alert('Memory cleared successfully!');
      }
    } catch (error) {
      console.error('Error clearing Pinecone memory:', error);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageHeader = (message: Message) => {
    if (message.sender === 'ai' && message.taskType) {
      const taskIcons = {
        writing: '✍',
        reading: '📖',
        analysis: '🔍',
        reasoning: '🤔',
        creative: '🎨',
        qa: '❓'
      };
      
      const taskNames = {
        writing: 'Writing Assistant',
        reading: 'Document Analysis',
        analysis: 'Content Analysis',
        reasoning: 'Reasoning Engine',
        creative: 'Creative AI',
        qa: 'Q&A Assistant'
      };
      
      return ${taskIcons[message.taskType as keyof typeof taskIcons] || '🤖'} ${taskNames[message.taskType as keyof typeof taskNames] || 'AI Assistant'};
    }
    
    return message.sender === 'user' ? '👤 You' : '🤖 AI Assistant';
  };

  return (
    <div className={styles.container}>
      {/* Doodle Background Elements */}
      <div className={styles.doodleBackground}>
        <div className={styles.doodle1}>✨</div>
        <div className={styles.doodle2}>🪐</div>
        <div className={styles.doodle3}>🌟</div>
        <div className={styles.doodle4}>🔮</div>
        <div className={styles.doodle5}>🚀</div>
        <div className={styles.doodle6}>👾</div>
      </div>

      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🤖</span>
          <span>Cosmic AI Buddy</span>
        </Link>
        <nav>
          <ul>
            <li><Link href="/">Home</Link></li>
            <li>
              <button 
                onClick={() => setIsManagingMemory(!isManagingMemory)}
                className={styles.memoryToggle}
              >
                {isManagingMemory ? 'Hide Memory' : 'Manage Memory'} 🧠
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.aiContainer}>
          <h1>Your Cosmic AI Companion! 🌈</h1>
          <p className={styles.subtitle}>Let's chat, create, and explore together! 🚀</p>

          {/* Memory Management Panel */}
          {isManagingMemory && (
            <div className={styles.memoryPanel}>
              <h3>🧠 Memory Management</h3>
              <div className={styles.memoryActions}>
                <button onClick={getPineconeStats} className={styles.memoryButton}>
                  Get Memory Stats
                </button>
                <button onClick={clearPineconeMemory} className={styles.memoryButton}>
                  Clear All Memory
                </button>
              </div>
              {pineconeStats && (
                <div className={styles.memoryStats}>
                  <h4>Memory Statistics:</h4>
                  <p>Total Vectors: {pineconeStats.totalVectors || 'N/A'}</p>
                  {pineconeStats.indexStats && (
                    <pre>{JSON.stringify(pineconeStats.indexStats, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conversation Starters */}
          <div className={styles.startersSection}>
            <h2>Quick Ideas to Get Started 🎯</h2>
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
                <div className={styles.welcomeAvatar}>👋</div>
                <h3>Hello Space Explorer! 🌌</h3>
                <p>I'm your friendly AI buddy with memory superpowers! I can remember our conversations and learn from them.</p>
                <div className={styles.featuresGrid}>
                  <div className={styles.feature}>📝 Writing & Stories</div>
                  <div className={styles.feature}>❓ Questions & Answers</div>
                  <div className={styles.feature}>📄 File Analysis</div>
                  <div className={styles.feature}>💡 Creative Ideas</div>
                  <div className={styles.feature}>🤔 Reasoning & Logic</div>
                  <div className={styles.feature}>🎨 Creative AI</div>
                </div>
                <p>Type a message or try one of the ideas above! ⬆</p>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id} className={$`{styles.message} ${message.sender === 'user' ? styles.userMessage : styles.aiMessage}`}>
                  <div className={styles.messageHeader}>
                    <span className={styles.sender}>
                      {getMessageHeader(message)}
                    </span>
                    <span className={styles.timestamp}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>
                      {message.text}
                    </div>
                    {message.files && message.files.length > 0 && (
                      <div className={styles.messageFiles}>
                        <strong>📁 Attached:</strong>
                        {message.files.map(file => (
                          <span key={file.name} className={styles.fileTag}>
                            {file.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reasoning Steps */}
                  {message.reasoningSteps && message.reasoningSteps.length > 0 && (
                    <div className={styles.reasoningSection}>
                      <button 
                        onClick={() => setShowReasoning(!showReasoning)}
                        className={styles.toggleButton}
                      >
                        {showReasoning ? 'Hide Reasoning' : 'Show Reasoning Steps'} 🤔
                      </button>
                      {showReasoning && (
                        <div className={styles.reasoningSteps}>
                          <h4>Thinking Process:</h4>
                          {message.reasoningSteps.map((step, index) => (
                            <div key={index} className={styles.reasoningStep}>
                              {step}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Similar Content */}
                  {message.similarContent && message.similarContent.length > 0 && (
                    <div className={styles.contextSection}>
                      <button 
                        onClick={() => setShowContext(!showContext)}
                        className={styles.toggleButton}
                      >
                        {showContext ? 'Hide Context' : 'Show Relevant Memory'} 📚
                      </button>
                      {showContext && (
                        <div className={styles.similarContent}>
                          <h4>Relevant Memory Context:</h4>
                          {message.similarContent.map((content, index) => (
                            <div key={index} className={styles.contextItem}>
                              {content}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
              <h3>📂 Files Ready to Send:</h3>
              <div className={styles.filesList}>
                {selectedFiles.map(file => (
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
                  placeholder="Type your message here... Ask anything, share files, or let's create something fun! 🎨"
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
                    disabled={isLoading || (!inputText.trim() && selectedFiles.length === 0)}
                    className={styles.sendButton}
                  >
                    {isLoading ? '✨' : '🚀'} Send
                  </button>
                </div>
              </div>
            </div>
            
            <div className={styles.helpText}>
              <p>💫 <strong>Pro Tip:</strong> I can remember our conversations and use that context to help you better! 🌈</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}