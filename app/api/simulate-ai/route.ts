import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { feature, text: inputText } = await request.json();

    // Validate request
    if (!feature || !inputText) {
      return NextResponse.json(
        { error: "Feature and text are required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Define prompts for each feature
    const prompts: Record<string, string> = {
      summarize: `Please summarize the following text concisely while preserving the main points and essential information: ${inputText}`,
      autocorrect: `Correct any grammar, spelling, and punctuation errors in the following text. Maintain the original intent and improve readability: ${inputText}`,
      suggest: `Provide specific, actionable suggestions to improve the following text. Format as a numbered list: ${inputText}`,
      generate: `Based on the following input, generate enhanced content that follows best practices for this type of document: ${inputText}`,
    };

    const systemPrompts: Record<string, string> = {
      summarize:
        "You are a helpful assistant that summarizes text concisely while preserving key information.",
      autocorrect:
        "You are a grammar correction assistant. Return only the corrected text without additional commentary.",
      suggest:
        "You are a writing improvement assistant. Provide specific suggestions in a clear, numbered list format.",
      generate:
        "You are a content generation assistant. Create well-structured, coherent content based on the user's input.",
    };

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompts[feature] || "You are a helpful assistant.",
        },
        {
          role: "user",
          content: prompts[feature] || inputText,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const result =
      response.choices[0]?.message?.content || "No response generated.";

    return NextResponse.json({
      result,
      success: true,
    });
  } catch (error) {
    console.error("Error in simulate-ai API:", error);
    return NextResponse.json(
      { error: "Failed to process request with AI" },
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
