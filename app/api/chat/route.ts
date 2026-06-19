import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function generateAIResponse(messages: { role: string; content: string }[]) {
  const prompt = messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "codellama:latest",
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.95,
          max_tokens: 500,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from AI model API:", errorText);
      throw new Error(`AI model API error: ${errorText}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Request timeout: AI model API took too long");
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, message, history } = await req.json();

    if (!userId || !message) {
      return NextResponse.json({ error: "User ID and message are required" }, { status: 400 });
    }

    // Save user message to DB
    await prisma.chatMessage.create({
      data: {
        userId,
        role: "user",
        content: message,
      },
    });

    // Construct prompt from history and current message
    const messages = history.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content,
    }));
    messages.push({ role: "user", content: message });

    const aiResponse = await generateAIResponse(messages);

    // Save AI response to DB
    await prisma.chatMessage.create({
      data: {
        userId,
        role: "assistant",
        content: aiResponse,
      },
    });

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Error in AI chat route:", error);
    return NextResponse.json({ error: "Failed to generate AI response", details: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json({ error: "Failed to fetch chat history", details: (error as Error).message }, { status: 500 });
  }
}
