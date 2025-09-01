import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { feature, text } = await request.json();

    // Validate request
    if (!feature || !text) {
      return NextResponse.json(
        { error: "Feature and text are required" },
        { status: 400 }
      );
    }

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock responses for each feature
    const mockResponses: Record<string, string> = {
      summarize:
        "This is a summarized version of your text. The main points have been extracted while preserving the core meaning and essential information. The AI has identified key concepts and presented them in a concise format that maintains the original context and intent.",
      autocorrect:
        "Your text has been corrected for grammar and spelling. The corrections maintain your original intent while improving readability. The AI has also enhanced sentence structure for better flow and clarity, ensuring your message is communicated effectively.",
      suggest:
        "Based on your content, I suggest:\n\n1. Consider adding an introduction to provide context\n2. Expand on the second point with specific examples\n3. Use more descriptive language in the conclusion\n4. Include data or statistics to support your claims\n5. Consider breaking long paragraphs into shorter ones for better readability",
      generate:
        "Based on your input, I've generated this enhanced content. The structure follows best practices for this type of document while incorporating your key ideas. The AI has expanded on your concepts with additional insights and organized the information in a logical flow that engages readers and effectively communicates your message.",
    };

    const result = mockResponses[feature] || "AI output will appear here.";

    return NextResponse.json({
      result,
      success: true,
    });
  } catch (error) {
    console.error("Error in simulate-ai API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
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
