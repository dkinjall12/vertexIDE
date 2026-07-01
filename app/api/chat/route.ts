import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HF_TOKEN!);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface EnhancePromptRequest {
  prompt: string;
  context?: {
    fileName?: string;
    language?: string;
    codeContent?: string;
  };
}

async function generateAIResponse(messages: ChatMessage[]) {
  const systemPrompt = `You are an expert AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers. When showing code, use proper formatting with language-specific syntax.
Keep responses concise but comprehensive. Use code blocks with language specification when providing code examples.`;

  try {
    const completion = await client.chatCompletion({
    provider: "groq",  
    model: "openai/gpt-oss-20b",

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],

      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content?.trim() || "";
  } catch (error) {
    console.error("AI generation error:", error);
    throw new Error("Failed to generate AI response");
  }
}

async function enhancePrompt(request: EnhancePromptRequest) {
  const enhancementPrompt = `You are a prompt enhancement assistant.

Take the user's prompt and rewrite it so that it is more specific, detailed, and effective for an AI coding assistant.

Original Prompt:
"${request.prompt}"

Context:
${request.context ? JSON.stringify(request.context, null, 2) : "No additional context"}

Requirements:
- Make the prompt clearer.
- Add technical context where useful.
- Keep the original intent.
- Return ONLY the improved prompt.`;

  try {
    const completion = await client.chatCompletion({
    provider: "groq",
    model: "openai/gpt-oss-20b",

      messages: [
        {
          role: "user",
          content: enhancementPrompt,
        },
      ],

      temperature: 0.3,
      max_tokens: 500,
    });

    return (
      completion.choices[0].message.content?.trim() || request.prompt
    );
  } catch (error) {
    console.error("Prompt enhancement error:", error);
    return request.prompt;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Prompt Enhancement
    if (body.action === "enhance") {
      const enhancedPrompt = await enhancePrompt(body);
      console.log(process.env.HF_TOKEN);
      return NextResponse.json({
        enhancedPrompt,
      });
    }

    // Chat
    const { message, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const validHistory = Array.isArray(history)
      ? history.filter(
          (msg: any) =>
            msg &&
            typeof msg === "object" &&
            typeof msg.role === "string" &&
            typeof msg.content === "string" &&
            ["user", "assistant"].includes(msg.role)
        )
      : [];

    const recentHistory = validHistory.slice(-10);

    const messages: ChatMessage[] = [
      ...recentHistory,
      {
        role: "user",
        content: message,
      },
    ];

    const aiResponse = await generateAIResponse(messages);

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "AI Chat API is running",
    provider: "Hugging Face",
    model: "openai/gpt-oss-20b",
    timestamp: new Date().toISOString(),
  });
}