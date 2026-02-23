import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type UploadedStudyDoc = {
  name: string;
  type: "notes" | "psq" | "reference";
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function chunkText(text: string, chunkSize = 700): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push(normalized.slice(i, i + chunkSize));
  }

  return chunks;
}

function keywordOverlapScore(query: string, candidate: string): number {
  const queryTokens = new Set(tokenize(query));
  const candidateTokens = tokenize(candidate);

  if (queryTokens.size === 0 || candidateTokens.length === 0) return 0;

  let overlap = 0;
  for (const token of candidateTokens) {
    if (queryTokens.has(token)) overlap += 1;
  }

  return overlap / Math.sqrt(queryTokens.size * candidateTokens.length);
}

function buildRagContext(input: string, docs: UploadedStudyDoc[]): string {
  const scored: { score: number; source: string; chunk: string }[] = [];

  for (const doc of docs) {
    const chunks = chunkText(doc.content);
    for (const chunk of chunks) {
      const score = keywordOverlapScore(input, chunk);
      if (score > 0) {
        scored.push({
          score,
          source: `${doc.type.toUpperCase()} • ${doc.name}`,
          chunk,
        });
      }
    }
  }

  const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);
  if (top.length === 0) {
    return "No directly relevant uploaded context found.";
  }

  return top
    .map(
      (item, index) =>
        `[${index + 1}] Source: ${item.source}\nSnippet: ${item.chunk}`
    )
    .join("\n\n");
}

function buildSystemPrompt(ragContext: string) {
  return `You are Math Study Buddy, an FYP-ready assistant for university mathematics learners.

Core behavior (SFT-style alignment):
- Teach with patience, clarity, and strong mathematical correctness.
- Focus on topics like calculus, algebra, statistics, discrete math, and numerical methods.
- If needed, ask a short clarifying question before solving.
- Always show concise, structured reasoning as a "Reasoning Outline" (do not reveal hidden chain-of-thought).
- End with a short "What to practice next" recommendation.
- If retrieved context conflicts with math rules, prioritize mathematical correctness and mention the conflict.

RAG context from uploaded Notes / PSQ / references:
${ragContext}

Answer format:
1) Final Answer
2) Reasoning Outline
3) What to practice next`;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, uploadedDocs = [] } = (await request.json()) as {
      messages?: ChatMessage[];
      uploadedDocs?: UploadedStudyDoc[];
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "user")?.content;

    const ragContext = latestUserMessage
      ? buildRagContext(latestUserMessage, uploadedDocs)
      : "No user query provided.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(ragContext),
        },
        ...messages,
      ],
      max_tokens: 900,
      temperature: 0.3,
    });

    return NextResponse.json({
      message:
        response.choices[0]?.message?.content ||
        "I couldn't generate a response. Please try again.",
      success: true,
      ragContextUsed: ragContext,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to process your request" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
