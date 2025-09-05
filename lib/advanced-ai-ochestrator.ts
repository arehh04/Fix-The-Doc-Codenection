import { StateGraph, END } from "@langchain/langgraph";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { readFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Optional: Pinecone for vector storage (comment out if not using)
// import { Pinecone } from '@pinecone-database/pinecone';

// Define the state interface
interface AIState {
  input: string;
  files?: string[];
  fileContents?: { name: string; content: string }[];
  response?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  taskType?:
    | "writing"
    | "reading"
    | "qa"
    | "analysis"
    | "reasoning"
    | "creative";
  embeddings?: number[];
  similarContent?: string[];
  reasoningSteps?: string[];
}

// Initialize AI models
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

const ollamaModel = new ChatOllama({
  baseUrl: process.env.OLLAMA_BASE_URL,
  model: process.env.OLLAMA_MODEL,
});

// Initialize OpenAI Embeddings
const openaiEmbeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Optional: Initialize Pinecone (comment out if not using)
// const pinecone = new Pinecone({
//   apiKey: process.env.PINECONE_API_KEY!,
// });
// const index = pinecone.Index('ai-memory');

// Memory storage (simple in-memory for demo, replace with Pinecone for production)
const memoryStore = new Map<string, { content: string; embedding: number[] }>();

// File processing function
async function processFiles(state: AIState): Promise<Partial<AIState>> {
  if (!state.files || state.files.length === 0) {
    return { fileContents: [] };
  }

  const fileContents: { name: string; content: string }[] = [];
  for (const filePath of state.files) {
    try {
      const content = await readFile(filePath, "utf-8");
      fileContents.push({ name: path.basename(filePath), content });

      // Store file content in memory with embeddings
      const embedding = await openaiEmbeddings.embedQuery(content);
      memoryStore.set(uuidv4(), { content, embedding });
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  return { fileContents };
}

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Generate embeddings and find similar content
async function generateEmbeddings(state: AIState): Promise<Partial<AIState>> {
  try {
    const embedding = await openaiEmbeddings.embedQuery(state.input);

    // Find similar content from memory
    const similarContent: string[] = [];
    for (const [, item] of memoryStore.entries()) {
      const similarity = cosineSimilarity(embedding, item.embedding);
      if (similarity > 0.7) {
        similarContent.push(item.content.substring(0, 200) + "...");
      }
    }

    return { embeddings: embedding, similarContent };
  } catch (error) {
    console.error("Embedding error:", error);
    return {};
  }
}

// Enhanced task classification with embeddings
async function classifyTask(state: AIState): Promise<Partial<AIState>> {
  const { input, fileContents, embeddings } = state;

  let taskType: AIState["taskType"] | undefined = undefined;

  // Use embeddings + Ollama for classification if available
  if (embeddings) {
    const classificationPrompt = `Classify this text into one of: writing, reading, qa, analysis, reasoning, creative.
Text: ${input}

Respond with only the category name:`;

    try {
      const messages = [
        new SystemMessage(
          "You are a task classification expert. Respond with only the category name."
        ),
        new HumanMessage(classificationPrompt),
      ];

      const response = await ollamaModel.invoke(messages);
      const classification = response?.content?.toString().trim().toLowerCase();
      if (
        classification &&
        [
          "writing",
          "reading",
          "qa",
          "analysis",
          "reasoning",
          "creative",
        ].includes(classification)
      ) {
        taskType = classification as AIState["taskType"];
      }
    } catch (error) {
      console.error("Classification error:", error);
    }
  }

  // Fallback to keyword matching
  if (!taskType) {
    const lowerInput = (input || "").toLowerCase();

    if (
      lowerInput.includes("write") ||
      lowerInput.includes("create") ||
      lowerInput.includes("compose")
    ) {
      taskType = "writing";
    } else if (fileContents && fileContents.length > 0) {
      if (lowerInput.includes("analyze") || lowerInput.includes("summarize")) {
        taskType = "analysis";
      } else {
        taskType = "reading";
      }
    } else if (
      lowerInput.includes("think") ||
      lowerInput.includes("reason") ||
      lowerInput.includes("logic")
    ) {
      taskType = "reasoning";
    } else if (
      lowerInput.includes("creative") ||
      lowerInput.includes("imagine") ||
      lowerInput.includes("story")
    ) {
      taskType = "creative";
    } else {
      taskType = "qa";
    }
  }

  return { taskType };
}

// Extract reasoning steps from response
function extractReasoningSteps(response: string): string[] {
  const steps: string[] = [];
  const lines = response.split("\n");

  for (const line of lines) {
    if (
      line.match(/^(step \d+[:]|•|\d+[.)])/i) ||
      line.toLowerCase().includes("reasoning:")
    ) {
      steps.push(line.trim());
    }
  }

  return steps.length > 0 ? steps : [response];
}

// Advanced reasoning with chain-of-thought
async function handleReasoningTask(state: AIState): Promise<Partial<AIState>> {
  const { input, similarContent, conversationHistory } = state;

  const context =
    similarContent && similarContent.length > 0
      ? `Relevant context from previous conversations:\n${similarContent.join(
          "\n"
        )}\n\n`
      : "";

  const messages = [
    new SystemMessage(`You are an advanced reasoning assistant. Use chain-of-thought reasoning and provide clear, logical steps.

${context}
Please think step by step and explain your reasoning process.`),
    new HumanMessage(input),
  ];

  try {
    const response = await ollamaModel.invoke(messages);
    const respText = response?.content?.toString() ?? "";
    const reasoningSteps = extractReasoningSteps(respText);

    return {
      response: `🤔 Reasoning Process:\n${respText}`,
      reasoningSteps,
      conversationHistory: [
        ...(conversationHistory || []),
        { role: "user", content: input },
        { role: "assistant", content: respText },
      ],
    };
  } catch (error) {
    console.error("Reasoning error:", error);
    throw new Error("Failed to process reasoning task");
  }
}

// Creative tasks with Gemini
async function handleCreativeTask(state: AIState): Promise<Partial<AIState>> {
  const { input, similarContent, conversationHistory } = state;

  const context =
    similarContent && similarContent.length > 0
      ? `Inspiration from previous work:\n${similarContent.join("\n")}\n\n`
      : "";

  const prompt = `You are a creative AI assistant. Generate imaginative, engaging, and original content.

${context}
User request: ${input}

Please create something truly creative and unique:`;

  try {
    const result: any = await geminiModel.generateContent(prompt);
    // result.response.text() may be a function depending on SDK; handle common cases:
    const responseText =
      (result?.response &&
        (typeof result.response.text === "function"
          ? result.response.text()
          : result.response.text)) ||
      result?.text ||
      "";

    return {
      response: `🎨 Creative Response:\n${responseText}`,
      conversationHistory: [
        ...(conversationHistory || []),
        { role: "user", content: input },
        { role: "assistant", content: responseText },
      ],
    };
  } catch (error) {
    console.error("Creative task error:", error);
    throw new Error("Failed to generate creative content");
  }
}

// Enhanced writing task with context awareness
async function handleWritingTask(state: AIState): Promise<Partial<AIState>> {
  const { input, fileContents, similarContent, conversationHistory } = state;

  let context = "";
  if (fileContents && fileContents.length > 0) {
    context = `Based on these files: ${fileContents
      .map((f) => f.name)
      .join(", ")}\n\n`;
    context += fileContents
      .map(
        (f) => `File: ${f.name}\nContent: ${f.content.substring(0, 1000)}...`
      )
      .join("\n\n");
  }

  if (similarContent && similarContent.length > 0) {
    context += `\n\nRelated previous content:\n${similarContent.join("\n")}`;
  }

  const prompt = `You are an expert writing assistant. Create high-quality, context-aware content.

${context}

User request: ${input}

Please provide a well-structured, engaging response that builds on previous context:`;

  try {
    const result: any = await geminiModel.generateContent(prompt);
    const responseText =
      (result?.response &&
        (typeof result.response.text === "function"
          ? result.response.text()
          : result.response.text)) ||
      result?.text ||
      "";

    // Store the generated content in memory
    try {
      const embedding = await openaiEmbeddings.embedQuery(responseText);
      memoryStore.set(uuidv4(), { content: responseText, embedding });
    } catch (err) {
      console.error("Failed to embed generated writing:", err);
    }

    return {
      response: `✍ Writing Assistant:\n${responseText}`,
      conversationHistory: [
        ...(conversationHistory || []),
        { role: "user", content: input },
        { role: "assistant", content: responseText },
      ],
    };
  } catch (error) {
    console.error("Writing error:", error);
    throw new Error("Failed to generate writing content");
  }
}

// Enhanced Q&A with contextual awareness
async function handleQATask(state: AIState): Promise<Partial<AIState>> {
  const { input, similarContent, conversationHistory } = state;

  const context =
    similarContent && similarContent.length > 0
      ? `Relevant context from previous conversations:\n${similarContent.join(
          "\n"
        )}\n\n`
      : "";

  const messages = [
    new SystemMessage(`You are a friendly, knowledgeable assistant. Provide helpful, human-like responses that are easy to understand.

${context}
Be conversational, empathetic, and engaging in your responses.`),
    // replay conversationHistory: user messages as HumanMessage, assistant messages as SystemMessage to preserve flow
    ...(conversationHistory || []).map((msg) =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new SystemMessage(msg.content)
    ),
    new HumanMessage(input),
  ];

  try {
    const response = await ollamaModel.invoke(messages);
    const respText = response?.content?.toString() ?? "";

    // Store Q&A in memory
    try {
      const embedding = await openaiEmbeddings.embedQuery(respText);
      memoryStore.set(uuidv4(), { content: respText, embedding });
    } catch (err) {
      console.error("Failed to embed Q&A response:", err);
    }

    return {
      response: respText,
      conversationHistory: [
        ...(conversationHistory || []),
        { role: "user", content: input },
        { role: "assistant", content: respText },
      ],
    };
  } catch (error) {
    console.error("Q&A error:", error);
    throw new Error("Failed to generate response");
  }
}

// Simple reading handler (summarize / extract from files)
async function handleReadingTask(state: AIState): Promise<Partial<AIState>> {
  const { input, fileContents, similarContent, conversationHistory } = state;

  const context =
    (fileContents && fileContents.length > 0
      ? `Files:\n${fileContents
          .map((f) => `${f.name}: ${f.content.substring(0, 500)}...`)
          .join("\n\n")}\n\n`
      : "") +
    (similarContent && similarContent.length > 0
      ? `Related content:\n${similarContent.join("\n")}\n\n`
      : "");

  const prompt = `You are a helpful assistant that digests documents. Given the following context, answer or summarize as requested.

${context}
User request: ${input}

Please produce a concise, clear, and useful output.`;

  try {
    const result: any = await geminiModel.generateContent(prompt);
    const responseText =
      (result?.response &&
        (typeof result.response.text === "function"
          ? result.response.text()
          : result.response.text)) ||
      result?.text ||
      "";

    return {
      response: responseText,
      conversationHistory: [
        ...(conversationHistory || []),
        { role: "user", content: input },
        { role: "assistant", content: responseText },
      ],
    };
  } catch (error) {
    console.error("Reading error:", error);
    throw new Error("Failed to process reading task");
  }
}

// Create the advanced LangGraph workflow
const workflow = new StateGraph({
  channels: {
    input: {
      value: null,
    },
    files: {
      value: null,
    },
    fileContents: {
      value: null,
    },
    response: {
      value: null,
    },
    conversationHistory: {
      value: (x: any[] | undefined) => x || [],
    },
    taskType: {
      value: null,
    },
    embeddings: {
      value: null,
    },
    similarContent: {
      value: null,
    },
    reasoningSteps: {
      value: null,
    },
  },
});

// Add nodes to the workflow
workflow.addNode("process_files", processFiles);
workflow.addNode("generate_embeddings", generateEmbeddings);
workflow.addNode("classify_task", classifyTask);
workflow.addNode("handle_writing", handleWritingTask);
workflow.addNode("handle_reading", handleReadingTask);
workflow.addNode("handle_qa", handleQATask);
workflow.addNode("handle_reasoning", handleReasoningTask);
workflow.addNode("handle_creative", handleCreativeTask);

// Set entry point
workflow.setEntryPoint("process_files");

// Add edges
workflow.addEdge("process_files", "generate_embeddings");
workflow.addEdge("generate_embeddings", "classify_task");

// Conditional routing based on task type
workflow.addConditionalEdges("classify_task", (state: AIState) => {
  // map state.taskType to the appropriate handler node
  const type = state.taskType || "qa";
  switch (type) {
    case "writing":
      return "handle_writing";
    case "reading":
      return "handle_reading";
    case "analysis":
    case "reasoning":
      // analysis could reuse reasoning or reading depending on design
      return type === "analysis" ? "handle_reading" : "handle_reasoning";
    case "creative":
      return "handle_creative";
    case "qa":
    default:
      return "handle_qa";
  }
});

// Add edges to END for each final handler
workflow.addEdge("handle_writing", END);
workflow.addEdge("handle_reading", END);
workflow.addEdge("handle_qa", END);
workflow.addEdge("handle_reasoning", END);
workflow.addEdge("handle_creative", END);

// Compile the graph
const app = workflow.compile();

// Export the run function
export async function runAdvancedAIWorkflow(
  input: string,
  files: string[] = [],
  conversationHistory: any[] = []
) {
  try {
    const result: any = await app.invoke({
      input,
      files,
      conversationHistory,
    });

    return {
      success: true,
      response: result?.response ?? null,
      conversationHistory: result?.conversationHistory ?? conversationHistory,
      taskType: result?.taskType ?? null,
      reasoningSteps: result?.reasoningSteps ?? null,
      similarContent: result?.similarContent ?? null,
    };
  } catch (error) {
    console.error("Advanced AI Workflow error:", error);
    return {
      success: false,
      error: "Failed to process request",
    };
  }
}

// Export memory store for persistence (optional)
export function getMemoryStats() {
  return {
    size: memoryStore.size,
    keys: Array.from(memoryStore.keys()),
  };
}

export function clearMemory() {
  memoryStore.clear();
}
