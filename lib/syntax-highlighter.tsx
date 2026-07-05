"use client";

import React from "react";

// This is a basic syntax highlighter for code
// In a production app, consider using a library like Prism.js or highlight.js
export function highlightSyntax(code: string, fileExtension: string): string {
  if (!code) return "";
  
  // Basic syntax highlighting based on file extension
  switch (fileExtension) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return highlightJavaScript(code);
    case "css":
    case "scss":
      return highlightCSS(code);
    case "html":
      return highlightHTML(code);
    case "json":
      return highlightJSON(code);
    case "md":
      return highlightMarkdown(code);
    default:
      return code;
  }
}

// Very simple syntax highlighter for React/JSX components
function SyntaxHighlighter({ code, fileExtension }: { code: string; fileExtension: string }) {
  const highlightedCode = React.useMemo(() => {
    return highlightSyntax(code, fileExtension);
  }, [code, fileExtension]);

  return (
    <pre className="rounded-md bg-muted p-4 overflow-auto max-h-[calc(100vh-8rem)] whitespace-pre-wrap">
      <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
    </pre>
  );
}

export default SyntaxHighlighter;

// Basic highlighting functions
function highlightJavaScript(code: string): string {
  // Replace keywords, strings, comments, etc.
  return code
    .replace(
      /(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|async|await|try|catch|throw|new|this|typeof|instanceof)/g,
      '<span style="color: #c678dd;">$1</span>'
    )
    .replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color: #98c379;">$1</span>')
    .replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, '<span style="color: #7f848e;">$1</span>')
    .replace(/(\{|\}|\(|\)|\[|\]|=>|;|,|\.)/g, '<span style="color: #abb2bf;">$1</span>')
    .replace(/(true|false|null|undefined|NaN)/g, '<span style="color: #d19a66;">$1</span>')
    .replace(/(\d+)/g, '<span style="color: #d19a66;">$1</span>');
}

function highlightCSS(code: string): string {
  return code
    .replace(/([\.\#][a-zA-Z0-9\-\_]+)/g, '<span style="color: #e06c75;">$1</span>')
    .replace(/(\{|\}|;|:)/g, '<span style="color: #abb2bf;">$1</span>')
    .replace(/([\-]?[0-9]+[\.]*[0-9]*(%|px|em|rem|vh|vw|ch|ex|pt|pc|cm|mm|in))/g, '<span style="color: #d19a66;">$1</span>');
}

function highlightHTML(code: string): string {
  return code
    .replace(/(&lt;[\/]?[a-zA-Z0-9\-]+)/g, '<span style="color: #e06c75;">$1</span>')
    .replace(/(&gt;)/g, '<span style="color: #e06c75;">$1</span>')
    .replace(/(class|id|style|src|href|alt|title|width|height)=/g, '<span style="color: #d19a66;">$1=</span>')
    .replace(/(".*?")/g, '<span style="color: #98c379;">$1</span>');
}

function highlightJSON(code: string): string {
  return code
    .replace(/(".*?"):/g, '<span style="color: #e06c75;">$1</span>:')
    .replace(/: (".*?")/g, ': <span style="color: #98c379;">$1</span>')
    .replace(/: (true|false|null)/g, ': <span style="color: #d19a66;">$1</span>')
    .replace(/: (\d+)/g, ': <span style="color: #d19a66;">$1</span>')
    .replace(/(\{|\}|\[|\]|,)/g, '<span style="color: #abb2bf;">$1</span>');
}

function highlightMarkdown(code: string): string {
  return code
    .replace(/^(# .+)$/gm, '<span style="color: #e06c75; font-size: 1.5em; font-weight: bold;">$1</span>')
    .replace(/^(## .+)$/gm, '<span style="color: #e06c75; font-size: 1.3em; font-weight: bold;">$1</span>')
    .replace(/^(### .+)$/gm, '<span style="color: #e06c75; font-size: 1.1em; font-weight: bold;">$1</span>')
    .replace(/(\*\*.*?\*\*)/g, '<span style="font-weight: bold;">$1</span>')
    .replace(/(\*.*?\*)/g, '<span style="font-style: italic;">$1</span>')
    .replace(/(\[.*?\]\(.*?\))/g, '<span style="color: #61afef;">$1</span>')
    .replace(/(`.*?`)/g, '<span style="background-color: rgba(0,0,0,0.1); padding: 0 3px; border-radius: 3px;">$1</span>');
}