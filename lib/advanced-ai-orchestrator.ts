import { StateGraph, END } from "@langchain/langgraph";
import { RunnableFunction } from "@langchain/core/runnables";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { readFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Pinecone } from "@pinecone-database/pinecone";
import { z } from "zod";

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
  memoryContext?: string;
}

// Check required environment variables
const requiredEnv = [
  "GOOGLE_API_KEY",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "OPENAI_API_KEY",
  "PINECONE_API_KEY",
  "PINECONE_INDEX",
];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`);
  }
}

// Initialize AI models
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

const ollamaModel = new ChatOllama({
  baseUrl: process.env.OLLAMA_BASE_URL,
  model: process.env.OLLAMA_MODEL,
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
const index = pinecone.Index(process.env.PINECONE_INDEX!);

// Initialize Pinecone index
async function initializePinecone() {
  try {
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(
      (i) => i.name === process.env.PINECONE_INDEX
    );
    if (!indexExists) {
      await pinecone.createIndex({
        name: process.env.PINECONE_INDEX!,
        dimension: 1536,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
      console.log("Pinecone index created");
    }
  } catch (error) {
    console.error("Pinecone initialization error:", error);
  }
}
initializePinecone();

// Store content in Pinecone
async function storeInPinecone(content: string, metadata: any = {}) {
  try {
    const embedding = await embeddings.embedQuery(content);
    const id = uuidv4();
    await index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          content: content.substring(0, 1000),
          fullContent: content,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      },
    ]);
    return id;
  } catch (error) {
    console.error("Pinecone store error:", error);
    return null;
  }
}

// Search similar content in Pinecone
async function searchPinecone(
  query: string,
  topK: number = 3
): Promise<string[]> {
  try {
    const queryEmbedding = await embeddings.embedQuery(query);
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false,
    });
    return results.matches
      .filter((match) => match.score && match.score > 0.7)
      .map((match) => {
        const content =
          match.metadata?.fullContent || match.metadata?.content || "";
        return typeof content === "string" ? content : "";
      })
      .filter(
        (content): content is string =>
          typeof content === "string" && content.length > 0
      );
  } catch (error) {
    console.error("Pinecone search error:", error);
    return [];
  }
}

// File processing function
async function processFiles(state: AIState): Promise<AIState> {
  if (!state.files || state.files.length === 0) {
    return { ...state, fileContents: [] };
  }
  const fileContents = [];
  for (const filePath of state.files) {
    try {
      const content = await readFile(filePath, "utf-8");
      fileContents.push({ name: path.basename(filePath), content });
      await storeInPinecone(content, {
        type: "file",
        filename: path.basename(filePath),
        source: "file-upload",
      });
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }
  return { ...state, fileContents };
}

// Generate embeddings and find similar content from Pinecone
async function generateEmbeddings(state: AIState): Promise<Partial<AIState>> {
  try {
    const embedding = await embeddings.embedQuery(state.input);
    const similarContent = await searchPinecone(state.input);
    const conversationContext = state.conversationHistory
      .map((msg) => msg.content)
      .join(" ")
      .substring(0, 1000);
    const historySimilarContent = await searchPinecone(conversationContext);
    const allSimilarContent = [...similarContent, ...historySimilarContent];
    const uniqueSimilarContent = Array.from(new Set(allSimilarContent)).slice(
      0,
      5
    );
    const memoryContext =
      uniqueSimilarContent.length > 0
        ? `Relevant context from memory:\n${uniqueSimilarContent.join("\n\n")}`
        : "";
    return {
      embeddings: embedding,
      similarContent: uniqueSimilarContent,
      memoryContext,
    };
  } catch (error) {
    console.error("Embedding error:", error);
    return {};
  }
}

// Enhanced task classification with embeddings
async function classifyTask(state: AIState): Promise<AIState> {
  const { input, fileContents, memoryContext: stateMemoryContext } = state;
  let taskType: AIState["taskType"] = "qa";
  const context = stateMemoryContext
    ? `Context: ${stateMemoryContext}\n\n`
    : "";
  const classificationPrompt = `${context}Classify this user input into one of these categories: 
  - writing: for content creation, writing, generating text
  - reading: for document analysis, reading comprehension
  - qa: for questions and answers, explanations
  - analysis: for data analysis, summarization, extraction
  - reasoning: for logical reasoning, problem solving
  - creative: for creative writing, storytelling, imagination
  
  Input: "${input}"
  
  Respond with only the category name:`;
  try {
    const messages = [
      new SystemMessage(
        "You are a task classification expert. Respond with only the category name."
      ),
      new HumanMessage(classificationPrompt),
    ];
    const response = await ollamaModel.invoke(messages);
    const category = response.content.toString().trim().toLowerCase();
    const validCategories = [
      "writing",
      "reading",
      "qa",
      "analysis",
      "reasoning",
      "creative",
    ];
    if (validCategories.includes(category)) {
      taskType = category as AIState["taskType"];
    }
  } catch (error) {
    console.error("Classification error:", error);
  }
  // Fallback to keyword matching
  if (!taskType || taskType === "qa") {
    const lowerInput = input.toLowerCase();
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
    }
  }
  return { ...state, taskType };
}

// Enhanced writing task with Pinecone context
async function handleWritingTask(state: AIState): Promise<Partial<AIState>> {
  const { input, fileContents, memoryContext, conversationHistory } = state;
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
  if (memoryContext) {
    context += `\n\n${memoryContext}`;
  }
  const prompt = `You are an expert writing assistant. Create high-quality, context-aware content.

${context}

User request: ${input}

Please provide a well-structured, engaging response that builds on previous context:`;
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    await storeInPinecone(response, {
      type: "response",
      task: "writing",
      input: input.substring(0, 200),
    });
    return {
      response: `✍ Writing Assistant:\n${response}`,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: input },
        { role: "assistant", content: response },
      ],
    };
  } catch (error) {
    console.error("Writing error:", error);
    throw new Error("Failed to generate writing content");
  }
}

// Enhanced reading task with Pinecone context
async function handleReadingTask(state: AIState): Promise<Partial<AIState>> {
  const { input, fileContents, memoryContext, conversationHistory } = state;
  let context = "";
  if (fileContents && fileContents.length > 0) {
    context = `Here are the files for reading and analysis: ${fileContents
      .map((f) => f.name)
      .join(", ")}\n\n`;
    context += fileContents
      .map(
        (f) => `File: ${f.name}\nContent: ${f.content.substring(0, 1000)}...`
      )
      .join("\n\n");
  }
  if (memoryContext) {
    context += `\n\n${memoryContext}`;
  }
  const prompt = `You are an expert reading assistant. Carefully read and analyze the provided content.

${context}

User request: ${input}

Please provide a thorough, insightful response based on the above content:`;
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    await storeInPinecone(response, {
      type: "response",
      task: "reading",
      input: input.substring(0, 200),
    });
    return {
      response: `📖 Reading Assistant:\n${response}`,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: input },
        { role: "assistant", content: response },
      ],
    };
  } catch (error) {
    console.error("Reading error:", error);
    throw new Error("Failed to generate reading content");
  }
}

// Enhanced Q&A with Pinecone context
async function handleQATask(state: AIState): Promise<Partial<AIState>> {
  const { input, memoryContext: qaMemoryContext, conversationHistory } = state;
  const context = qaMemoryContext ? `${qaMemoryContext}\n\n` : "";
  const messages = [
    new SystemMessage(`You are a friendly, knowledgeable assistant. Provide helpful, human-like responses.

${context}
Be conversational, empathetic, and engaging in your responses.`),
    ...conversationHistory.map((msg) =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new SystemMessage(msg.content)
    ),
    new HumanMessage(input),
  ];
  try {
    const response = await ollamaModel.invoke(messages);
    const responseText = response.content.toString();
    await storeInPinecone(responseText, {
      type: "response",
      task: "qa",
      question: input.substring(0, 200),
    });
    return {
      response: responseText,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: input },
        { role: "assistant", content: responseText },
      ],
    };
  } catch (error) {
    console.error("Q&A error:", error);
    throw new Error("Failed to generate response");
  }
}

// Enhanced reasoning with Pinecone context
async function handleReasoningTask(state: AIState): Promise<Partial<AIState>> {
  const {
    input,
    memoryContext: localMemoryContext,
    conversationHistory,
  } = state;
  const context = localMemoryContext
    ? `Relevant context:\n${localMemoryContext}\n\n`
    : "";
  const messages = [
    new SystemMessage(`You are an advanced reasoning assistant. Use chain-of-thought reasoning.

${context}
Please think step by step and explain your reasoning process.`),
    new HumanMessage(input),
  ];
  try {
    const response = await ollamaModel.invoke(messages);
    const responseText = response.content.toString();
    const reasoningSteps = extractReasoningSteps(responseText);
    await storeInPinecone(responseText, {
      type: "response",
      task: "reasoning",
      input: input.substring(0, 200),
    });
    return {
      response: `🤔 Reasoning Process:\n${responseText}`,
      reasoningSteps,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: input },
        { role: "assistant", content: responseText },
      ],
    };
  } catch (error) {
    console.error("Reasoning error:", error);
    throw new Error("Failed to process reasoning task");
  }
}

// Extract reasoning steps from response
function extractReasoningSteps(response: string): string[] {
  const steps: string[] = [];
  const lines = response.split("\n");
  for (const line of lines) {
    if (line.match(/^(step \d+[:]|•|\d+[.)]|reasoning[:])/i)) {
      steps.push(line.trim());
    }
  }
  return steps.length > 0 ? steps : [response];
}

// Creative task
async function handleCreativeTask(state: AIState): Promise<AIState> {
  const {
    input,
    memoryContext,
    conversationHistory,
    files,
    fileContents,
    taskType,
    embeddings,
    similarContent,
    reasoningSteps,
  } = state;
  const context = memoryContext ? `${memoryContext}\n\n` : "";
  const prompt = `You are a creative assistant. Use imagination and creativity to respond.\n${context}\nUser request: ${input}\nPlease provide a creative, original response:`;
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    await storeInPinecone(response, {
      type: "response",
      task: "creative",
      input: input.substring(0, 200),
    });
    return {
      input,
      files,
      fileContents,
      response: `🎨 Creative Assistant:\n${response}`,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: input },
        { role: "assistant", content: response },
      ],
      taskType,
      embeddings,
      similarContent,
      reasoningSteps,
      memoryContext,
    };
  } catch (error) {
    console.error("Creative error:", error);
    throw new Error("Failed to generate creative content");
  }
}

// Define the state schema using zod
const aiStateSchema = z.object({
  input: z.string(),
  files: z.array(z.string()).optional(),
  fileContents: z
    .array(z.object({ name: z.string(), content: z.string() }))
    .optional(),
  response: z.string().optional(),
  conversationHistory: z.array(
    z.object({ role: z.string(), content: z.string() })
  ),
  taskType: z
    .enum(["writing", "reading", "qa", "analysis", "reasoning", "creative"])
    .optional(),
  embeddings: z.array(z.number()).optional(),
  similarContent: z.array(z.string()).optional(),
  reasoningSteps: z.array(z.string()).optional(),
  memoryContext: z.string().optional(),
});

// Create the advanced LangGraph workflow with Pinecone
const workflow = new StateGraph(aiStateSchema);

workflow.addNode("__start__", RunnableFunction.from(processFiles));
workflow.addNode(
  "generate_embeddings",
  RunnableFunction.from(generateEmbeddings)
);
workflow.addNode("classify_task", RunnableFunction.from(classifyTask));
workflow.addNode("handle_writing", RunnableFunction.from(handleWritingTask));
workflow.addNode("handle_reading", RunnableFunction.from(handleReadingTask));
workflow.addNode("handle_qa", RunnableFunction.from(handleQATask));
workflow.addNode(
  "handle_reasoning",
  RunnableFunction.from(handleReasoningTask)
);
workflow.addNode("handle_creative", RunnableFunction.from(handleCreativeTask));

workflow.setEntryPoint("__start__");
workflow.addEdge("__start__", "generate_embeddings");
workflow.addEdge("generate_embeddings", "classify_task");

workflow.addConditionalEdges(
  "classify_task",
  (state: AIState) => state.taskType || "qa",
  {
    writing: "handle_writing",
    reading: "handle_reading",
    qa: "handle_qa",
    analysis: "handle_reading",
    reasoning: "handle_reasoning",
    creative: "handle_creative",
  }
);

workflow.addEdge("handle_writing", END);
workflow.addEdge("handle_reading", END);
workflow.addEdge("handle_qa", END);
workflow.addEdge("handle_reasoning", END);
workflow.addEdge("handle_creative", END);

const app = workflow.compile();
const app = workflow.compile();

// Export the run function
export async function runAdvancedAIWorkflow(
  input: string,
  files: string[] = [],
  conversationHistory: any[] = []
) {
  try {
    const result = await app.invoke({
      input,
      files,
      conversationHistory,
    });
    return {
      success: true,
      response: result.response,
      conversationHistory: result.conversationHistory,
      taskType: result.taskType,
      reasoningSteps: result.reasoningSteps,
      similarContent: result.similarContent,
      memoryContext: result.memoryContext,
    };
  } catch (error) {
    console.error("Advanced AI Workflow error:", error);
    return {
      success: false,
      error: "Failed to process request",
    };
  }
}

// Pinecone management functions
export async function getPineconeStats() {
  try {
    const indexStats = await index.describeIndexStats();
    return {
      totalVectors: indexStats.totalRecordCount,
      indexStats: indexStats,
    };
  } catch (error) {
    console.error("Pinecone stats error:", error);
    return { error: "Failed to get Pinecone stats" };
  }
}
export async function clearPineconeIndex() {
  try {
    await index.deleteAll();
    return { success: true, message: "Pinecone index cleared" };
  } catch (error) {
    console.error("Pinecone clear error:", error);
    return { error: "Failed to clear Pinecone index" };
  }
}
