import { NextRequest, NextResponse } from "next/server";
import { createHash } from 'crypto';

// Types
interface CodeContext {
  content: string;
  line: number;
  column: number;
  type: string;
  fileName?: string;
  language?: string;
  projectContext?: {
    framework?: string;
    dependencies?: string[];
    imports?: string[];
    recentFiles?: string[];
    openTabs?: { name: string; content: string }[];
  };
  userPreferences?: {
    style?: 'minimal' | 'verbose' | 'balanced';
    includeComments?: boolean;
    preferredPatterns?: string[];
    maxLines?: number;
  };
}

interface AnalyzedContext {
  currentLine: string;
  beforeCursor: string;
  afterCursor: string;
  indentLevel: number;
  isInFunction: boolean;
  isInClass: boolean;
  isInComment: boolean;
  isInString: boolean;
  isInJSX: boolean;
  currentScope: 'global' | 'function' | 'class' | 'method' | 'block';
  incompletePatterns: {
    function: boolean;
    conditional: boolean;
    loop: boolean;
    object: boolean;
    array: boolean;
    assignment: boolean;
    methodCall: boolean;
    import: boolean;
    jsx: boolean;
  };
  surroundingElements: {
    functions: string[];
    variables: string[];
    classes: string[];
    imports: string[];
    exports: string[];
    types: string[];
  };
  codeStyle: {
    usesTypeScript: boolean;
    usesSemicolons: boolean;
    usesArrowFunctions: boolean;
    indentationType: 'spaces' | 'tabs';
    indentSize: number;
    quotingStyle: 'single' | 'double' | 'mixed';
  };
}

const analyzeCodeContext = (content: string, line: number, column: number): AnalyzedContext => {
  const lines = content.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.substring(0, column);
  const afterCursor = currentLine.substring(column);
  
  // Analyze indentation
  const indentMatch = currentLine.match(/^(\s*)/);
  const indentLevel = indentMatch ? indentMatch[1].length : 0;
  const indentationType = currentLine.includes('\t') ? 'tabs' : 'spaces';
  const indentSize = indentationType === 'spaces' ? 
    (lines.find(l => l.match(/^\s+/))?.match(/^\s+/)?.[0].length || 2) : 1;
  
  // Analyze scope context
  let currentScope: AnalyzedContext['currentScope'] = 'global';
  let isInFunction = false;
  let isInClass = false;
  
  // Look backwards to find current scope
  for (let i = line; i >= 0; i--) {
    const lineText = lines[i];
    if (lineText.match(/^\s*(class|interface|enum)\s+/)) {
      isInClass = true;
      currentScope = 'class';
      break;
    }
    if (lineText.match(/^\s*(function|def|fn|async\s+function|const\s+\w+\s*=\s*(?:async\s+)?\(|let\s+\w+\s*=\s*(?:async\s+)?\()/)) {
      isInFunction = true;
      currentScope = 'function';
      break;
    }
    if (lineText.match(/^\s*\w+\s*$$[^)]*$$\s*[{:]/) && isInClass) {
      currentScope = 'method';
      isInFunction = true;
      break;
    }
  }
  
  // Detect if in comment or string
  const isInComment = beforeCursor.includes('//') || 
                     beforeCursor.includes('/*') || 
                     beforeCursor.includes('#') ||
                     /^\s*\*/.test(beforeCursor);
  
  const singleQuotes = (beforeCursor.match(/'/g) || []).length;
  const doubleQuotes = (beforeCursor.match(/"/g) || []).length;
  const backticks = (beforeCursor.match(/`/g) || []).length;
  const isInString = singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1;
  
  // Detect JSX context
  const isInJSX = content.includes('jsx') || content.includes('tsx') || 
                  /import.*React/.test(content) || /<\w+/.test(beforeCursor);
  
  // Detect incomplete patterns
  const incompletePatterns = {
    function: /^\s*(function\s+\w*\s*\(|def\s+\w*\s*\(|const\s+\w+\s*=\s*(?:async\s+)?\(|let\s+\w+\s*=\s*(?:async\s+)?\()/.test(beforeCursor) ||
              /^\s*(function|def|async\s+function)\s*$/.test(beforeCursor.trim()),
    conditional: /^\s*(if\s*\(|else\s+if\s*\(|while\s*\(|switch\s*\(|case\s+)/.test(beforeCursor.trim()) ||
                /^\s*(if|else|elif|while|for|switch)\s*$/.test(beforeCursor.trim()),
    loop: /^\s*(for\s*\(|while\s*\(|do\s*\{|for\s+\w+\s+in\s+)/.test(beforeCursor.trim()),
    object: beforeCursor.trim().endsWith('{') || /^\s*\w+\s*:\s*\{?\s*$/.test(beforeCursor.trim()),
    array: beforeCursor.trim().endsWith('[') || /^\s*\[\s*$/.test(beforeCursor.trim()),
    assignment: /^\s*(?:const|let|var)\s+\w+\s*=\s*$/.test(beforeCursor.trim()) ||
                /^\s*\w+\s*=\s*$/.test(beforeCursor.trim()),
    methodCall: /\w+\.\s*$/.test(beforeCursor.trim()) || /\w+\(\s*$/.test(beforeCursor.trim()),
    import: /^\s*(import|from)\s+/.test(beforeCursor.trim()) || /^\s*import\s*$/.test(beforeCursor.trim()),
    jsx: /<\w*\s*$/.test(beforeCursor.trim()) || /^\s*</.test(beforeCursor.trim())
  };
  
  // Extract surrounding elements
  const surroundingElements = extractSurroundingElements(content, line);
  
  // Analyze code style
  const codeStyle = analyzeCodeStyle(content);
  
  return {
    currentLine,
    beforeCursor,
    afterCursor,
    indentLevel,
    isInFunction,
    isInClass,
    isInComment,
    isInString,
    isInJSX,
    currentScope,
    incompletePatterns,
    surroundingElements,
    codeStyle
  };
};

const extractSurroundingElements = (content: string, currentLine: number) => {
  const lines = content.split('\n');
  const contextRadius = 20;
  const startLine = Math.max(0, currentLine - contextRadius);
  const endLine = Math.min(lines.length, currentLine + contextRadius);
  const contextLines = lines.slice(startLine, endLine);
  
  const functions: string[] = [];
  const variables: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];
  const exports: string[] = [];
  const types: string[] = [];
  
  contextLines.forEach(line => {
    // Extract functions
    const funcMatch = line.match(/(?:function|def|fn)\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/);
    if (funcMatch) functions.push(funcMatch[1] || funcMatch[2]);
    
    // Extract variables
    const varMatch = line.match(/(?:const|let|var)\s+(\w+)(?!\s*=\s*(?:async\s+)?\()/);
    if (varMatch) variables.push(varMatch[1]);
    
    // Extract classes
    const classMatch = line.match(/(?:class|interface|enum)\s+(\w+)/);
    if (classMatch) classes.push(classMatch[1]);
    
    // Extract imports
    const importMatch = line.match(/import\s+(?:\{([^}]+)\}|(\w+))|from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      if (importMatch[1]) imports.push(...importMatch[1].split(',').map(s => s.trim()));
      if (importMatch[2]) imports.push(importMatch[2]);
      if (importMatch[3]) imports.push(importMatch[3]);
    }
    
    // Extract exports
    const exportMatch = line.match(/export\s+(?:(?:const|let|var|function|class)\s+(\w+)|default\s+(\w+)|\{([^}]+)\})/);
    if (exportMatch) {
      if (exportMatch[1]) exports.push(exportMatch[1]);
      if (exportMatch[2]) exports.push(exportMatch[2]);
      if (exportMatch[3]) exports.push(...exportMatch[3].split(',').map(s => s.trim()));
    }
    
    // Extract TypeScript types
    const typeMatch = line.match(/(?:type|interface)\s+(\w+)/);
    if (typeMatch) types.push(typeMatch[1]);
  });
  
  return { functions, variables, classes, imports, exports, types };
};

const analyzeCodeStyle = (content: string) => {
  const lines = content.split('\n');
  
  return {
    usesTypeScript: content.includes(': ') && (content.includes('interface ') || content.includes('type ')),
    usesSemicolons: lines.filter(l => l.trim().endsWith(';')).length > lines.length * 0.3,
    usesArrowFunctions: (content.match(/=>\s*[{(]/g) || []).length > (content.match(/function\s+\w+/g) || []).length,
    indentationType: content.includes('\t') ? 'tabs' : 'spaces' as 'spaces' | 'tabs',
    indentSize: content.match(/^  /m) ? 2 : content.match(/^    /m) ? 4 : 2,
    quotingStyle: (content.match(/'/g) || []).length > (content.match(/"/g) || []).length ? 'single' : 'double' as 'single' | 'double'
  };
};

const detectAdvancedLanguage = (content: string, fileName?: string): string => {
  // File extension detection
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      'ts': 'TypeScript', 'tsx': 'TypeScript/React', 'js': 'JavaScript', 'jsx': 'JavaScript/React',
      'py': 'Python', 'java': 'Java', 'cs': 'C#', 'go': 'Go', 'rs': 'Rust', 'php': 'PHP',
      'rb': 'Ruby', 'cpp': 'C++', 'c': 'C', 'swift': 'Swift', 'kt': 'Kotlin', 'vue': 'Vue'
    };
    if (ext && extMap[ext]) return extMap[ext];
  }
  
  // Content-based detection with weighted scoring
  const languagePatterns = {
    'TypeScript': { patterns: ['interface ', 'type ', ':string', ':number', 'as ', 'implements'], weight: 3 },
    'JavaScript': { patterns: ['const ', 'let ', 'var ', 'function ', '=>', 'require('], weight: 2 },
    'Python': { patterns: ['def ', 'class ', 'import ', 'from ', '__init__', 'self'], weight: 3 },
    'Java': { patterns: ['public class', 'private ', 'void ', 'extends ', 'package '], weight: 3 },
    'C#': { patterns: ['namespace ', 'using ', 'public class', 'async Task'], weight: 3 },
    'Go': { patterns: ['func ', 'package ', 'interface ', 'struct ', 'chan '], weight: 3 },
    'Rust': { patterns: ['fn ', 'impl ', 'struct ', 'enum ', 'trait ', 'pub '], weight: 3 },
    'PHP': { patterns: ['<?php', 'function ', '->', '$', 'namespace '], weight: 3 }
  };
  
  let bestMatch = { language: 'JavaScript', score: 0 };
  
  Object.entries(languagePatterns).forEach(([lang, { patterns, weight }]) => {
    const score = patterns.reduce((acc, pattern) => 
      acc + (content.includes(pattern) ? weight : 0), 0);
    if (score > bestMatch.score) {
      bestMatch = { language: lang, score };
    }
  });
  
  return bestMatch.language;
};

const detectFramework = (content: string, imports: string[]): string => {
  const frameworks = [
    { name: 'React', patterns: ['import React', 'useState', 'useEffect', 'jsx', 'tsx'] },
    { name: 'Vue', patterns: ['import Vue', '<template>', 'vue', '@vue/'] },
    { name: 'Angular', patterns: ['@angular/', '@Component', 'NgModule', 'Injectable'] },
    { name: 'Next.js', patterns: ['next/', 'getServerSideProps', 'getStaticProps'] },
    { name: 'Express', patterns: ['express', 'app.get', 'app.post', 'req.', 'res.'] },
    { name: 'FastAPI', patterns: ['from fastapi', '@app.get', 'FastAPI('] },
    { name: 'Django', patterns: ['from django', 'models.Model', 'django.http'] },
    { name: 'Spring Boot', patterns: ['@SpringBootApplication', '@RestController', '@Service'] }
  ];
  
  for (const framework of frameworks) {
    const score = framework.patterns.reduce((acc, pattern) => 
      acc + (content.includes(pattern) || imports.some(imp => imp.includes(pattern)) ? 1 : 0), 0);
    if (score > 0) return framework.name;
  }
  
  return 'Unknown';
};

const buildContextualPrompt = (context: CodeContext): string => {
  const analyzed = analyzeCodeContext(context.content, context.line, context.column);
  const language = context.language || detectAdvancedLanguage(context.content, context.fileName);
  const framework = detectFramework(context.content, analyzed.surroundingElements.imports);
  
  // Build enhanced context window
  const lines = context.content.split('\n');
  const contextRadius = context.userPreferences?.maxLines || 15;
  const contextStart = Math.max(0, context.line - contextRadius);
  const contextEnd = Math.min(lines.length, context.line + contextRadius);
  
  const contextLines = lines.slice(contextStart, contextEnd).map((lineText, idx) => {
    const actualLine = contextStart + idx;
    const lineNum = (actualLine + 1).toString().padStart(3, ' ');
    
    if (actualLine === context.line) {
      const before = lineText.slice(0, context.column);
      const after = lineText.slice(context.column);
      return `${lineNum}: ${before}<CURSOR>${after}`;
    }
    return `${lineNum}: ${lineText}`;
  }).join('\n');
  
  // Determine suggestion intent based on incomplete patterns
  const suggestionIntent = determineSuggestionIntent(analyzed, context.type);
  
  // Build comprehensive prompt
  return `You are an expert AI code completion assistant like GitHub Copilot. Provide intelligent, contextually-aware code suggestions.

<ANALYSIS>
Language: ${language}
Framework: ${framework}
File: ${context.fileName || 'untitled'}
Suggestion Type: ${context.type}
Intent: ${suggestionIntent}
Current Scope: ${analyzed.currentScope}
Style: ${context.userPreferences?.style || 'balanced'}
</ANALYSIS>

<CODE_CONTEXT>
\`\`\`${language.toLowerCase()}
${contextLines}
\`\`\`
</CODE_CONTEXT>

<CURRENT_STATE>
- Cursor Position: Line ${context.line + 1}, Column ${context.column + 1}
- Indent Level: ${analyzed.indentLevel} ${analyzed.codeStyle.indentationType}
- In Function: ${analyzed.isInFunction}
- In Class: ${analyzed.isInClass}
- In Comment: ${analyzed.isInComment}
- In String: ${analyzed.isInString}
${analyzed.isInJSX ? '- In JSX: true' : ''}
</CURRENT_STATE>

<INCOMPLETE_PATTERNS>
${Object.entries(analyzed.incompletePatterns)
  .filter(([_, detected]) => detected)
  .map(([pattern, _]) => `- ${pattern}: needs completion`)
  .join('\n') || '- None detected'}
</INCOMPLETE_PATTERNS>

<AVAILABLE_CONTEXT>
- Functions: ${analyzed.surroundingElements.functions.slice(0, 10).join(', ') || 'None'}
- Variables: ${analyzed.surroundingElements.variables.slice(0, 10).join(', ') || 'None'}
- Classes: ${analyzed.surroundingElements.classes.join(', ') || 'None'}
- Imports: ${analyzed.surroundingElements.imports.slice(0, 8).join(', ') || 'None'}
- Types: ${analyzed.surroundingElements.types.join(', ') || 'None'}
</AVAILABLE_CONTEXT>

<CODE_STYLE_PREFERENCES>
- TypeScript: ${analyzed.codeStyle.usesTypeScript}
- Semicolons: ${analyzed.codeStyle.usesSemicolons}
- Arrow Functions: ${analyzed.codeStyle.usesArrowFunctions}
- Indentation: ${analyzed.codeStyle.indentSize} ${analyzed.codeStyle.indentationType}
- Quotes: ${analyzed.codeStyle.quotingStyle}
- Comments: ${context.userPreferences?.includeComments || false}
</CODE_STYLE_PREFERENCES>

${context.projectContext ? `<PROJECT_CONTEXT>
- Dependencies: ${context.projectContext.dependencies?.join(', ') || 'None'}
- Recent Files: ${context.projectContext.recentFiles?.slice(0, 5).join(', ') || 'None'}
</PROJECT_CONTEXT>` : ''}

<INSTRUCTIONS>
1. Analyze the cursor position and surrounding code context carefully
2. Understand the incomplete pattern and user intent
3. Generate intelligent, contextually appropriate code suggestions
4. Maintain consistent code style and naming conventions
5. Follow ${language} and ${framework} best practices
6. Provide practical, immediately useful completions
7. Consider error handling and edge cases where appropriate
8. Respect the current scope and available variables/functions

<OUTPUT_FORMAT>
Return ONLY the valid code that should be inserted at the cursor position.
- Do NOT include any language names, framework names, or descriptive text outside of valid code.
- No explanations or markdown formatting (e.g., \`\`\`javascript).
- No repetition of existing code, especially on the same line or immediately preceding lines.
- Maintain proper indentation and formatting consistent with the surrounding code.
- Follow the detected code style preferences.
- Ensure the suggestion is syntactically correct and contextually appropriate.
</OUTPUT_FORMAT>

Generate a high-quality ${context.type} suggestion:`;
};

const determineSuggestionIntent = (analyzed: AnalyzedContext, type: string): string => {
  const patterns = analyzed.incompletePatterns;
  
  if (patterns.function) return 'Complete function definition or body';
  if (patterns.conditional) return 'Complete conditional statement';
  if (patterns.loop) return 'Complete loop structure';
  if (patterns.object) return 'Complete object literal or properties';
  if (patterns.array) return 'Complete array literal or elements';
  if (patterns.assignment) return 'Complete variable assignment';
  if (patterns.methodCall) return 'Complete method call or chain';
  if (patterns.import) return 'Complete import statement';
  if (patterns.jsx) return 'Complete JSX element or component';
  
  if (analyzed.isInFunction) return 'Function body completion';
  if (analyzed.isInClass) return 'Class member completion';
  if (type === 'completion') return 'General code completion';
  if (type === 'function') return 'Function suggestion';
  if (type === 'variable') return 'Variable suggestion';
  
  return 'Context-aware code suggestion';
};

// Enhanced main function
const buildEnhancedPrompt = (
  content: string, 
  line: number, 
  column: number, 
  type: string,
  fileName?: string,
  language?: string,
  projectContext?: CodeContext['projectContext'],
  userPreferences?: CodeContext['userPreferences']
): string => {
  const context: CodeContext = {
    content,
    line,
    column,
    type,
    fileName,
    language,
    projectContext,
    userPreferences
  };
  
  return buildContextualPrompt(context);
};


// In-memory cache for performance
const suggestionCache = new Map<string, { suggestion: string; timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const generateCacheKey = (content: string, line: number, column: number, type: string): string => {
  return createHash('md5').update(`${content}${line}${column}${type}`).digest('hex');
};

// Heuristic-based framework detection


const buildPrompt = (content: string, line: number, column: number, type: string): string => {
  const lines = content.split('\n');
  const contextStart = Math.max(0, line - 5);
  const contextEnd = Math.min(lines.length, line + 5);

  const contextLines = lines.slice(contextStart, contextEnd).map((lineText, idx) => {
    const actualLine = contextStart + idx;
    if (actualLine === line) {
      const before = lineText.slice(0, column);
      const after = lineText.slice(column);
      return `${before}|CURSOR|${after}`;
    }
    return lineText;
  }).join('\n');

  const language = detectLanguage(content);

  return `You are an expert code suggestion assistant. Generate a ${type} suggestion at the cursor position marked with |CURSOR|.

<task>
Provide a ${type} suggestion for the code at the cursor.
</task>

<context>
Language: ${language}
---
${contextLines}
---
Cursor: Line ${line + 1}, Column ${column + 1}
</context>

<rules>
1. Return only the valid code.
2. Maintain syntax and indentation.
3. Respect the local context.
</rules>`;
};

// Request body type
interface CodeSuggestionRequest {
  fileContent: string;
  cursorLine: number;
  cursorColumn: number;
  suggestionType: string;
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body: CodeSuggestionRequest = await request.json();
    const { fileContent, cursorLine, cursorColumn, suggestionType } = body;

    // Input validation
    const errors = [];
    if (!fileContent) errors.push("Missing fileContent");
    if (cursorLine < 0) errors.push("cursorLine must be >= 0");
    if (cursorColumn < 0) errors.push("cursorColumn must be >= 0");
    if (!suggestionType) errors.push("Missing suggestionType");
    if (errors.length) return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });

    const cacheKey = generateCacheKey(fileContent, cursorLine, cursorColumn, suggestionType);
    const cached = suggestionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return NextResponse.json({
        suggestion: cached.suggestion,
        metadata: {
          cached: true,
          framework: detectFramework(fileContent, cached.suggestion.split('\n')),
          language: detectLanguage(fileContent),
          position: { line: cursorLine, column: cursorColumn },
        },
      });
    }

    const prompt = buildPrompt(fileContent, cursorLine, cursorColumn, suggestionType);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      return NextResponse.json({ error: "LLM API error", details: errorText }, { status: 502 });
    }

    const data = await response.json();
    let suggestion = data.response.split('\`\`\`')[1]?.trim();

    // Fix: Only extract code between |CURSOR| markers if present
    if (suggestion && suggestion.includes('|CURSOR|')) {
      // Remove all but the code at the cursor
      const match = suggestion.match(/\|CURSOR\|([\s\S]*)/);
      if (match && match[1]) {
        suggestion = match[1].replace(/\|CURSOR\|/g, '').trim();
      } else {
        // Remove all |CURSOR| markers if present
        suggestion = suggestion.replace(/\|CURSOR\|/g, '').trim();
      }
    }

    if (!suggestion) throw new Error("Invalid response format");

    suggestionCache.set(cacheKey, { suggestion, timestamp: Date.now() });

    return NextResponse.json({
      suggestion,
      metadata: {
        cached: false,
        framework: detectFramework(fileContent , suggestion.split('\n')),
        language: detectLanguage(fileContent),
        position: { line: cursorLine, column: cursorColumn },
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: "Timeout", message: "Request timed out" }, { status: 504 });
    }
    console.error("Suggestion API error:", err);
    return NextResponse.json({ error: "Internal Error", message: err.message }, { status: 500 });
  }
}

// Language detector
function detectLanguage(content: string): string {
  const matchers = {
    TypeScript: [/interface /, /: \w+/, /tsx?/],
    JavaScript: [/function /, /=>/, /const /],
    Python: [/def /, /self/, /import /],
    Java: [/public class/, /extends /],
    CSharp: [/namespace /, /using System/],
    Go: [/func /, /package main/],
    Rust: [/fn /, /pub /, /mod /],
    PHP: [/<\?php/, /namespace /],
    HTML: [/<html/, /<!DOCTYPE html/],
    JSON: [/\{\s*"/, /\[\s*\{?/],
  };

  for (const [lang, patterns] of Object.entries(matchers)) {
    if (patterns.some(p => p.test(content))) return lang;
  }

  return "Unknown";
}
