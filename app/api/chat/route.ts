import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, fileContent: uploadedFileContent } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // If file content is provided, prepend it to the conversation
    const systemMessage = {
      role: "system",
      content: uploadedFileContent
        ? `You are DocMind, a helpful document assistant. The user has provided a file with the following content: ${uploadedFileContent}. Help users with document-related tasks including writing, editing, summarizing, formatting, and analyzing documents. Keep responses focused and practical.`
        : "You are DocMind, a helpful document assistant. Help users with document-related tasks including writing, editing, summarizing, formatting, and analyzing documents. Keep responses focused and practical.",
    };

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [systemMessage, ...messages],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return NextResponse.json({
      message:
        response.choices[0]?.message?.content ||
        "Sorry, I couldn't generate a response.",
      success: true,
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
