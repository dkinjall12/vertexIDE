import { NextRequest, NextResponse } from "next/server";
import { createHash } from 'crypto';

type CodeSuggestionRequest = {
    fileContent: string;
    cursorLine: number;
    cursorColumn: number;
    suggestionType: string;
    language?: string;
    context?: {
        projectType?: string;
        dependencies?: string[];
        framework?: string;
    };
};

// Cache suggestions for performance
const suggestionCache = new Map<string, { suggestion: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const generateCacheKey = (content: string, line: number, column: number, type: string): string => {
    const hash = createHash('md5').update(`${content}${line}${column}${type}`).digest('hex');
    return hash;
};

const detectFramework = (content: string): string => {
    if (content.includes('import React') || content.includes('jsx')) return 'React';
    if (content.includes('import { Component') || content.includes('@angular')) return 'Angular';
    if (content.includes('import Vue') || content.includes('<template>')) return 'Vue';
    if (content.includes('import express')) return 'Express';
    if (content.includes('import next')) return 'Next.js';
    return 'Unknown';
};

const buildPrompt = (fileContent: string, cursorLine: number, cursorColumn: number, suggestionType: string) => {
    const lines = fileContent.split('\n');
    const totalLines = lines.length;
    const contextStart = Math.max(0, cursorLine - 5);
    const contextEnd = Math.min(totalLines, cursorLine + 5);
    const contextLines = lines.slice(contextStart, contextEnd);

    const contextWithCursor = contextLines.map((line, index) => {
        const actualLineNumber = contextStart + index + 1;
        if (actualLineNumber === cursorLine + 1) {
            const beforeCursor = line.substring(0, cursorColumn);
            const afterCursor = line.substring(cursorColumn);
            return `${beforeCursor}|CURSOR|${afterCursor}`;
        }
        return line; // Exclude line numbers here
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
File Content Around Cursor:
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
        const { fileContent, cursorLine, cursorColumn, suggestionType, context } = body;

        // Input validation with detailed errors
        const validationErrors = [];
        if (!fileContent) validationErrors.push("fileContent is required");
        if (cursorLine < 0) validationErrors.push("cursorLine must be >= 0");
        if (cursorColumn < 0) validationErrors.push("cursorColumn must be >= 0");
        if (!suggestionType) validationErrors.push("suggestionType is required");

        if (validationErrors.length > 0) {
            return NextResponse.json(
                { error: "Validation failed", details: validationErrors },
                { status: 400 }
            );
        }

        // Check cache first
        const cacheKey = generateCacheKey(fileContent, cursorLine, cursorColumn, suggestionType);
        const cachedResult = suggestionCache.get(cacheKey);
        
        if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
            return NextResponse.json({
                suggestion: cachedResult.suggestion,
                metadata: {
                    cached: true,
                    cursorPosition: { line: cursorLine, column: cursorColumn },
                    suggestionType,
                    framework: detectFramework(fileContent),
                    contextLines: Math.min(10, fileContent.split('\n').length),
                },
            });
        }

        const prompt = buildPrompt(fileContent, cursorLine, cursorColumn, suggestionType);

        // Enhanced error handling for LLM API
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
                    prompt: prompt,
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
                console.error("Error from LLM API:", errorText);
                throw new Error(`LLM API error: ${errorText}`);
            }

            const data = await response.json();
            const suggestion = data.response.split('```')[1]?.trim();

            if (!suggestion) {
                throw new Error("Invalid suggestion format from LLM");
            }

            // Cache the successful result
            suggestionCache.set(cacheKey, {
                suggestion,
                timestamp: Date.now()
            });

            // Enhanced response with metadata
            return NextResponse.json({
                suggestion,
                metadata: {
                    cursorPosition: { line: cursorLine, column: cursorColumn },
                    suggestionType,
                    framework: detectFramework(fileContent),
                    language: detectLanguage(fileContent),
                    contextLines: Math.min(10, fileContent.split('\n').length),
                    cached: false,
                    generatedAt: new Date().toISOString(),
                },
            });

        } catch (error) {
            if (error.name === 'AbortError') {
                return NextResponse.json(
                    { error: "Request timeout", details: "LLM API request took too long" },
                    { status: 504 }
                );
            }
            throw error;
        }

    } catch (error) {
        console.error("Error processing code suggestion request:", error);
        return NextResponse.json(
            { 
                error: "Internal server error",
                message: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

function detectLanguage(fileContent: string): string {
    // Common file patterns and keywords for various languages
    const patterns = {
        typescript: {
            keywords: ['interface', 'type', 'namespace', 'enum', ':string', ':number', ':boolean'],
            imports: ['.ts', '.tsx', 'from "react"'],
        },
        javascript: {
            keywords: ['const', 'let', 'var', 'function', '=>', 'async', 'await'],
            imports: ['.js', '.jsx', 'require('],
        },
        python: {
            keywords: ['def', 'class', 'import', 'from', '__init__', 'self'],
            imports: ['.py', 'from typing import'],
        },
        java: {
            keywords: ['public class', 'private', 'protected', 'void', 'extends', 'implements'],
            imports: ['import java.', 'package '],
        },
        csharp: {
            keywords: ['namespace', 'using', 'public class', 'private', 'protected', 'async Task'],
            imports: ['using System', '.cs'],
        },
        go: {
            keywords: ['func', 'package', 'interface', 'struct', 'chan', 'goroutine'],
            imports: ['import (', 'package main'],
        },
        rust: {
            keywords: ['fn', 'impl', 'struct', 'enum', 'trait', 'pub', 'mod'],
            imports: ['use std::', 'mod '],
        },
        php: {
            keywords: ['<?php', 'function', 'public function', 'namespace', '->'],
            imports: ['use ', 'namespace '],
        },
    };

    // Helper function to count matches
    const countMatches = (content: string, patterns: string[]): number => {
        return patterns.reduce((count, pattern) => 
            count + (content.includes(pattern) ? 1 : 0), 0);
    };

    // Calculate scores for each language
    const scores = Object.entries(patterns).map(([language, { keywords, imports }]) => ({
        language,
        score: countMatches(fileContent, keywords) + countMatches(fileContent, imports),
    }));

    // Sort by score and get the highest
    const bestMatch = scores.sort((a, b) => b.score - a.score)[0];

    // Special cases and refinements
    if (bestMatch.score === 0) {
        // Check for markup languages
        if (fileContent.includes('<!DOCTYPE html') || fileContent.includes('<html')) {
            return 'HTML';
        }
        if (fileContent.includes('<?xml')) {
            return 'XML';
        }
        if (fileContent.match(/[{}\[\]]:?\s*[\n\r]/)) {
            return 'JSON';
        }
        return 'Unknown';
    }

    // Add modifiers for specific frameworks/variants
    if (bestMatch.language === 'javascript' || bestMatch.language === 'typescript') {
        if (fileContent.includes('import React') || fileContent.includes('jsx')) {
            return `${bestMatch.language.charAt(0).toUpperCase() + bestMatch.language.slice(1)}/React`;
        }
        if (fileContent.includes('import { Component') || fileContent.includes('@angular')) {
            return `${bestMatch.language.charAt(0).toUpperCase() + bestMatch.language.slice(1)}/Angular`;
        }
        if (fileContent.includes('import Vue') || fileContent.includes('<template>')) {
            return `${bestMatch.language.charAt(0).toUpperCase() + bestMatch.language.slice(1)}/Vue`;
        }
    }

    return bestMatch.language.charAt(0).toUpperCase() + bestMatch.language.slice(1);
}