import { NextRequest, NextResponse } from "next/server";
import {
  runAdvancedAIWorkflow,
  getMemoryStats,
  clearMemory,
} from "../../../lib/advanced-ai-orchestrator";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "tmp");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const input = formData.get("input") as string;
    const files = formData.getAll("files") as File[];
    const conversationHistory = JSON.parse(
      (formData.get("conversationHistory") as string) || "[]"
    );
    const action = formData.get("action") as string;

    // Handle special actions
    if (action === "clear-memory") {
      clearMemory();
      return NextResponse.json({ success: true, message: "Memory cleared" });
    }

    if (action === "memory-stats") {
      const stats = getMemoryStats();
      return NextResponse.json({ success: true, stats });
    }

    if (!input && action !== "clear-memory" && action !== "memory-stats") {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    // Save uploaded files temporarily
    const filePaths: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${randomUUID()}-${file.name}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      await writeFile(filepath, buffer);
      filePaths.push(filepath);
    }

    // Process with advanced LangGraph workflow
    const result = await runAdvancedAIWorkflow(
      input,
      filePaths,
      conversationHistory
    );

    // Clean up temporary files
    for (const filepath of filePaths) {
      // await unlink(filepath).catch(console.error);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      response: result.response,
      conversationHistory: result.conversationHistory,
      taskType: result.taskType,
      reasoningSteps: result.reasoningSteps,
      similarContent: result.similarContent,
      success: true,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
