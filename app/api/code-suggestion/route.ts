import { NextRequest, NextResponse } from "next/server";

type CodeSuggestionRequest = {
    fileContent: string;
    cursorLine: number;
    cursorColumn: number;
    suggestionType: string;
};

const buildPrompt = (fileContent: string, cursorLine: number, cursorColumn: number, suggestionType: string) => {
    // Build the prompt as shown in the original code
    const lines = fileContent.split('\n');
    const totalLines = lines.length;
    const contextStart = Math.max(0, cursorLine - 5);
    const contextEnd = Math.min(totalLines, cursorLine + 5);
    const contextLines = lines.slice(contextStart, contextEnd);

    const contextWithCursor = contextLines.map((line, index) => {
        const actualLineNumber = contextStart + index + 1;
        const prefix = `${actualLineNumber}: `;
        if (actualLineNumber === cursorLine + 1) {
            const beforeCursor = line.substring(0, cursorColumn);
            const afterCursor = line.substring(cursorColumn);
            return `${prefix}${beforeCursor}|CURSOR|${afterCursor}`;
        }
        return `${prefix}${line}`;
    }).join('\n');

    const detectLanguage = (content: string): string => {
        if (content.includes('import React') || content.includes('jsx') || content.includes('tsx')) return 'React/TypeScript';
        if (content.includes('function') && content.includes('=>')) return 'JavaScript/TypeScript';
        return 'Unknown';
    };

    const detectedLanguage = detectLanguage(fileContent);

    return `You are an expert code completion assistant. Your task is to provide intelligent code suggestions based on the current context.

<task>
Provide a ${suggestionType} suggestion for the code at the cursor position marked with |CURSOR|.
</task>

<context>
Language: ${detectedLanguage}
File Content Around Cursor (lines ${contextStart + 1}-${contextEnd}):
\`\`\`
${contextWithCursor}
\`\`\`

Cursor Position: Line ${cursorLine + 1}, Column ${cursorColumn + 1}
Suggestion Type: ${suggestionType}
</context>

<instructions>
1. Analyze the code context carefully.
2. Provide a suggestion based on the type: "completion", "function", "variable", etc.
3. Format your response as valid code that can be directly inserted.
</instructions>`;
};

export async function POST(request: NextRequest) {
    try {
        const body: CodeSuggestionRequest = await request.json();
        const { fileContent, cursorLine, cursorColumn, suggestionType } = body;

        console.log("Received code suggestion request:", body);
        // Validate input
        if (!fileContent || cursorLine < 0 || cursorColumn < 0 || !suggestionType) {
            return NextResponse.json(
                { error: "Invalid request parameters" },
                { status: 400 }
            );
        }

        const prompt = buildPrompt(fileContent, cursorLine, cursorColumn, suggestionType);

        // Send the prompt to the local LLM API (codellama:latest)
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "codellama:latest",
                prompt: prompt,
                stream: false, // Disable streaming for simplicity
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error from LLM API:", errorText);
            return NextResponse.json(
                { error: "Failed to generate suggestion from LLM" },
                { status: 500 }
            );
        }

        const data = await response.json();

        // Return the suggestion from the LLM
        return NextResponse.json({
            suggestion: data.response, // Assuming the LLM API returns the suggestion in `response`
            metadata: {
                cursorPosition: { line: cursorLine, column: cursorColumn },
                suggestionType,
                contextLines: Math.min(10, fileContent.split('\n').length),
            },
        });
    } catch (error) {
        console.error("Error processing code suggestion request:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}