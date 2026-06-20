export interface CodeContext {
  line: number
  column: number
  currentLine: string
  beforeCursor: string
  afterCursor: string
  indentLevel: number
  isNewLine: boolean
  isAfterOpenBrace: boolean
  isInFunction: boolean
  isInClass: boolean
  isInComment: boolean
  lastNonEmptyLine: string
  shouldTrigger: boolean
}

export class CodeAnalyzer {
  /**
   * Analyze the code context at a specific position
   */
  analyzePosition(content: string, line: number, column: number): CodeContext {
    const lines = content.split("\n")
    const currentLine = lines[line] || ""
    const beforeCursor = currentLine.substring(0, column)
    const afterCursor = currentLine.substring(column)

    // Calculate indentation
    const indentMatch = currentLine.match(/^(\s*)/)
    const indentLevel = indentMatch ? indentMatch[1].length : 0

    // Check various contexts
    const isNewLine = beforeCursor.trim() === "" && column <= indentLevel + 1
    const isAfterOpenBrace = this.isAfterOpenBrace(lines, line)
    const isInFunction = this.isInFunction(lines, line)
    const isInClass = this.isInClass(lines, line)
    const isInComment = this.isInComment(beforeCursor)

    // Get last non-empty line
    const lastNonEmptyLine = this.getLastNonEmptyLine(lines, line)

    const context: CodeContext = {
      line,
      column,
      currentLine,
      beforeCursor,
      afterCursor,
      indentLevel,
      isNewLine,
      isAfterOpenBrace,
      isInFunction,
      isInClass,
      isInComment,
      lastNonEmptyLine,
      shouldTrigger: false,
    }

    context.shouldTrigger = this.shouldTriggerSuggestion(context)
    return context
  }

  /**
   * Determine if we should trigger a suggestion based on context
   */
  shouldTriggerSuggestion(context: CodeContext): boolean {
    // Don't suggest in comments
    if (context.isInComment) return false

    // Don't suggest if there's content after cursor (unless it's just whitespace)
    if (context.afterCursor.trim() !== "") return false

    // Trigger in these scenarios:
    return (
      context.isNewLine || // New line
      context.isAfterOpenBrace || // After opening brace
      /\.\s*$/.test(context.beforeCursor) || // After dot (method chaining)
      /=\s*$/.test(context.beforeCursor) || // After assignment
      /\(\s*$/.test(context.beforeCursor) || // After opening parenthesis
      /,\s*$/.test(context.beforeCursor) || // After comma
      /:\s*$/.test(context.beforeCursor) || // After colon
      /return\s*$/.test(context.beforeCursor) || // After return
      /console\.\s*$/.test(context.beforeCursor) || // After console.
      this.isAfterComment(context.beforeCursor) // After comment
    )
  }

  /**
   * Check if cursor is after an opening brace
   */
  private isAfterOpenBrace(lines: string[], currentLine: number): boolean {
    for (let i = currentLine - 1; i >= Math.max(0, currentLine - 3); i--) {
      const line = lines[i]?.trim()
      if (line && line.endsWith("{")) return true
      if (line && !line.match(/^\s*$/)) break // Stop at first non-empty line
    }
    return false
  }

  /**
   * Check if cursor is inside a function
   */
  private isInFunction(lines: string[], currentLine: number): boolean {
    let braceCount = 0
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i]
      if (!line) continue

      // Count braces to track scope
      braceCount += (line.match(/}/g) || []).length
      braceCount -= (line.match(/{/g) || []).length

      // If we're in a positive brace count, we're inside something
      if (braceCount > 0) continue

      // Check for function declarations
      if (
        line.match(
          /^\s*(function|def|fn|async\s+function|const\s+\w+\s*=\s*(?:async\s+)?\(|let\s+\w+\s*=\s*(?:async\s+)?\()/,
        )
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Check if cursor is inside a class
   */
  private isInClass(lines: string[], currentLine: number): boolean {
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i]
      if (line?.match(/^\s*(class|interface|enum)\s+/)) return true
    }
    return false
  }

  /**
   * Check if cursor is in a comment
   */
  private isInComment(beforeCursor: string): boolean {
    return (
      beforeCursor.includes("//") ||
      beforeCursor.includes("/*") ||
      beforeCursor.includes("#") ||
      /^\s*\*/.test(beforeCursor)
    )
  }

  /**
   * Check if cursor is after a comment (for comment-based suggestions)
   */
  private isAfterComment(beforeCursor: string): boolean {
    return /\/\/.*$/.test(beforeCursor.trim()) || /#.*$/.test(beforeCursor.trim())
  }

  /**
   * Get the last non-empty line before current position
   */
  private getLastNonEmptyLine(lines: string[], currentLine: number): string {
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = lines[i]?.trim()
      if (line) return line
    }
    return ""
  }
}
