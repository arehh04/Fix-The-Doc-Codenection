import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { feature, text, uploadType } = await request.json();

    if (!feature) {
      return NextResponse.json(
        { error: "Feature is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Different prompts based on upload type
    const uploadContext: Record<string, string> = {
      text: "the following text",
      file: "the content from the uploaded file",
      drive: "the document from Google Drive",
      link: "the content from the web link",
    };

    const prompts: Record<string, string> = {
      summarize: `Please summarize ${
        uploadContext[uploadType || "text"]
      } concisely while preserving the main points: ${text}`,
      autocorrect: `Correct any grammar, spelling, and punctuation errors in ${
        uploadContext[uploadType || "text"]
      }. Maintain the original intent: ${text}`,
      suggest: `Provide specific, actionable suggestions to improve ${
        uploadContext[uploadType || "text"]
      }. Format as a numbered list: ${text}`,
      generate: `Based on ${
        uploadContext[uploadType || "text"]
      }, generate enhanced content: ${text}`,
    };

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant that processes documents and text.",
        },
        {
          role: "user",
          content: prompts[feature] || text,
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
