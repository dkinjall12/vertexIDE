import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function generateAIResponse(messages: ChatMessage[]) {
  // Create a more structured prompt for better code assistance
  const systemPrompt = `You are an expert AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers. When showing code, use proper formatting with language-specific syntax.
Keep responses concise but comprehensive. Use code blocks with language specification when providing code examples.`;

  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  const prompt = fullMessages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for better responses

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
          top_p: 0.9,
          max_tokens: 1000, // Increased for more detailed responses
          num_predict: 1000,
          repeat_penalty: 1.1,
          context_length: 4096,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from AI model API:", errorText);
      throw new Error(`AI model API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error("No response from AI model");
    }

    return data.response.trim();
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Request timeout: AI model took too long to respond");
    }
    console.error("AI generation error:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required and must be a string" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate history format
    const validHistory = Array.isArray(history) ? history.filter(
      (msg: any) => 
        msg && 
        typeof msg === "object" && 
        typeof msg.role === "string" && 
        typeof msg.content === "string" &&
        ["user", "assistant"].includes(msg.role)
    ) : [];

    // Limit history to last 10 messages to prevent context overflow
    const recentHistory = validHistory.slice(-10);

    // Construct messages array
    const messages: ChatMessage[] = [
      ...recentHistory,
      { role: "user", content: message }
    ];

    console.log(`Generating AI response for message: "${message.substring(0, 50)}..."`);
    
    const aiResponse = await generateAIResponse(messages);

    if (!aiResponse) {
      throw new Error("Empty response from AI model");
    }

    console.log(`AI response generated successfully (${aiResponse.length} characters)`);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in AI chat route:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(JSON.stringify({ 
      error: "Failed to generate AI response", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ 
    status: "AI Chat API is running",
    timestamp: new Date().toISOString(),
    info: "Use POST method to send chat messages"
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
