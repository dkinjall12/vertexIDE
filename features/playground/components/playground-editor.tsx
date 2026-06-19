import { useRef, useEffect, useCallback } from 'react';
import Editor, { type Monaco } from "@monaco-editor/react";
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '@/features/playground/libs/editor-config';
import type { TemplateFile } from '@/features/playground/libs/path-to-json';

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined;
  content: string;
  onContentChange: (value: string) => void;
  suggestion: string | null;
  suggestionLoading: boolean;
  suggestionPosition: { line: number; column: number } | null;
  onAcceptSuggestion: (editor: any, monaco: any) => void;
  onRejectSuggestion: (editor: any) => void;
  onTriggerSuggestion: (type: string, editor: any) => void;
}

export const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  suggestion,
  suggestionLoading,
  suggestionPosition,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const inlineCompletionProviderRef = useRef<any>(null);
  const currentSuggestionRef = useRef<{
    text: string;
    position: { line: number; column: number };
    id: string;
  } | null>(null);
  const isAcceptingSuggestionRef = useRef(false);
  const lastCursorPositionRef = useRef<{ line: number; column: number } | null>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionAcceptedRef = useRef(false);

  // Generate unique ID for each suggestion
  const generateSuggestionId = () => `suggestion-${Date.now()}-${Math.random()}`;

  // Analyze code context for intelligent suggestions
  const analyzeCodeContext = useCallback((editor: any, position: any) => {
    const model = editor.getModel();
    if (!model) return null;

    const currentLine = position.lineNumber;
    const currentColumn = position.column;
    const totalLines = model.getLineCount();

    // Get surrounding code context
    const contextLines = 10; // Lines before and after for context
    const startLine = Math.max(1, currentLine - contextLines);
    const endLine = Math.min(totalLines, currentLine + contextLines);

    const beforeContext = [];
    const afterContext = [];

    // Get lines before current position
    for (let i = startLine; i < currentLine; i++) {
      beforeContext.push(model.getLineContent(i));
    }

    // Get current line up to cursor
    const currentLineContent = model.getLineContent(currentLine);
    const beforeCursor = currentLineContent.substring(0, currentColumn - 1);
    const afterCursor = currentLineContent.substring(currentColumn - 1);

    // Get lines after current position
    for (let i = currentLine + 1; i <= endLine; i++) {
      afterContext.push(model.getLineContent(i));
    }

    // Analyze the context
    const context = {
      beforeContext: beforeContext.join('\n'),
      currentLine: currentLineContent,
      beforeCursor,
      afterCursor,
      afterContext: afterContext.join('\n'),
      position: { line: currentLine, column: currentColumn },
      language: getEditorLanguage(activeFile?.fileExtension || ""),
      isNewLine: beforeCursor.trim() === '' && currentColumn === 1,
      isAfterOpenBrace: beforeContext.length > 0 && beforeContext[beforeContext.length - 1].trim().endsWith('{'),
      isInFunction: beforeContext.some(line => 
        /function\s+\w+\s*\(/.test(line) || 
        /const\s+\w+\s*=\s*\(/.test(line) || 
        /\w+\s*:\s*\(/.test(line)
      ),
      isInClass: beforeContext.some(line => /class\s+\w+/.test(line)),
      isInLoop: beforeContext.some(line => /for\s*\(|while\s*\(|\.map\s*\(|\.forEach\s*\(/.test(line)),
      isInConditional: beforeContext.some(line => /if\s*\(|else|switch\s*\(/.test(line)),
      hasImports: beforeContext.some(line => /import\s+/.test(line)),
      lastNonEmptyLine: beforeContext.filter(line => line.trim() !== '').pop() || '',
      indentLevel: beforeCursor.length - beforeCursor.trimStart().length,
    };

    return context;
  }, [activeFile]);

  // Determine if we should trigger a suggestion based on context
  const shouldTriggerSuggestion = useCallback((context: any) => {
    if (!context) return false;

    // Don't suggest if we're in the middle of a line
    if (context.afterCursor.trim() !== '' && !context.isNewLine) return false;

    // Don't suggest if already have an active suggestion
    if (currentSuggestionRef.current) return false;

    // Don't suggest if currently loading
    if (suggestionLoading) return false;

    // Trigger suggestions in these scenarios:
    const shouldTrigger = 
      context.isNewLine || // New line
      context.isAfterOpenBrace || // After opening brace
      (context.beforeCursor.trim() === '' && context.currentLine.trim() === '') || // Empty line
      /\.\s*$/.test(context.beforeCursor) || // After dot (method chaining)
      /=\s*$/.test(context.beforeCursor) || // After assignment
      /\(\s*$/.test(context.beforeCursor) || // After opening parenthesis
      /,\s*$/.test(context.beforeCursor) || // After comma
      /:\s*$/.test(context.beforeCursor) || // After colon
      /return\s*$/.test(context.beforeCursor) || // After return
      /console\.\s*$/.test(context.beforeCursor); // After console.

    return shouldTrigger;
  }, [suggestionLoading]);

  // Generate context-aware suggestion prompt
  const generateSuggestionPrompt = useCallback((context: any) => {
    const { language, beforeContext, currentLine, beforeCursor, afterCursor, afterContext } = context;
    
    let prompt = `Language: ${language}\n\n`;
    
    if (beforeContext.trim()) {
      prompt += `Previous code:\n${beforeContext}\n\n`;
    }
    
    prompt += `Current line: "${currentLine}"\n`;
    prompt += `Cursor position: after "${beforeCursor}"\n`;
    
    if (afterCursor.trim()) {
      prompt += `Remaining on line: "${afterCursor}"\n`;
    }
    
    if (afterContext.trim()) {
      prompt += `Following code:\n${afterContext}\n\n`;
    }

    // Add context-specific hints
    if (context.isAfterOpenBrace) {
      prompt += `Context: Inside a code block, suggest appropriate content.\n`;
    } else if (context.isInFunction) {
      prompt += `Context: Inside a function, suggest relevant logic.\n`;
    } else if (context.isInClass) {
      prompt += `Context: Inside a class, suggest methods or properties.\n`;
    } else if (context.isInLoop) {
      prompt += `Context: Inside a loop, suggest loop body content.\n`;
    } else if (context.isInConditional) {
      prompt += `Context: Inside a conditional, suggest appropriate logic.\n`;
    }

    return prompt;
  }, []);

  // Trigger context-aware suggestion
  const triggerContextAwareSuggestion = useCallback((editor: any, position: any) => {
    const context = analyzeCodeContext(editor, position);
    if (!context || !shouldTriggerSuggestion(context)) return;

    console.log('Triggering context-aware suggestion', {
      position: `${position.lineNumber}:${position.column}`,
      isNewLine: context.isNewLine,
      isAfterOpenBrace: context.isAfterOpenBrace,
      lastLine: context.lastNonEmptyLine
    });

    // Clear any existing timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // Trigger suggestion with a small delay to avoid too many rapid requests
    suggestionTimeoutRef.current = setTimeout(() => {
      const prompt = generateSuggestionPrompt(context);
      console.log('Generated prompt for AI:', prompt.substring(0, 200) + '...');

      // Check if the generated suggestion matches the current suggestion
      if (currentSuggestionRef.current && currentSuggestionRef.current.text === suggestion) {
        console.log('Duplicate suggestion detected, skipping');
        return;
      }

      // Call the parent's trigger function with the context
      onTriggerSuggestion("completion", editor);
    }, 300); // 300ms delay to debounce rapid cursor movements
  }, [analyzeCodeContext, shouldTriggerSuggestion, generateSuggestionPrompt, onTriggerSuggestion, suggestion]);

  // Clear suggestion timeout
  const clearSuggestionTimeout = useCallback(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = null;
    }
  }, []);

  // Create inline completion provider
  const createInlineCompletionProvider = useCallback((monaco: Monaco) => {
    return {
      provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
        console.log('provideInlineCompletions called', {
          hasSuggestion: !!suggestion,
          hasPosition: !!suggestionPosition,
          currentPos: `${position.lineNumber}:${position.column}`,
          suggestionPos: suggestionPosition ? `${suggestionPosition.line}:${suggestionPosition.column}` : null,
          isAccepting: isAcceptingSuggestionRef.current,
          suggestionAccepted: suggestionAcceptedRef.current
        });

        // Don't provide completions if we're currently accepting or have already accepted
        if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
          console.log('Skipping completion - already accepting or accepted');
          return { items: [] };
        }

        // Only provide suggestion if we have one
        if (!suggestion || !suggestionPosition) {
          console.log('No suggestion or position available');
          return { items: [] };
        }

        // Check if current position matches suggestion position (with some tolerance)
        const currentLine = position.lineNumber;
        const currentColumn = position.column;
        
        const isPositionMatch = currentLine === suggestionPosition.line && 
                               currentColumn >= suggestionPosition.column &&
                               currentColumn <= suggestionPosition.column + 2; // Small tolerance

        if (!isPositionMatch) {
          console.log('Position mismatch', {
            current: `${currentLine}:${currentColumn}`,
            expected: `${suggestionPosition.line}:${suggestionPosition.column}`
          });
          return { items: [] };
        }

        const suggestionId = generateSuggestionId();
        currentSuggestionRef.current = {
          text: suggestion,
          position: suggestionPosition,
          id: suggestionId
        };

        console.log('Providing inline completion', { suggestionId, suggestion: suggestion.substring(0, 50) + '...' });

        // Clean the suggestion text (remove \r characters)
        const cleanSuggestion = suggestion.replace(/\r/g, '');

        return {
          items: [
            {
              insertText: cleanSuggestion,
              range: new monaco.Range(
                suggestionPosition.line,
                suggestionPosition.column,
                suggestionPosition.line,
                suggestionPosition.column
              ),
              // Monaco expects these properties for inline completions
              kind: monaco.languages.CompletionItemKind.Snippet,
              label: 'AI Suggestion',
              detail: 'AI-generated code suggestion',
              documentation: 'Press Tab to accept',
              sortText: '0000', // High priority
              filterText: '',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              // Add proper command structure
              command: {
                id: 'ai-suggestion-provided',
                title: 'AI Suggestion Provided',
                arguments: [suggestionId]
              }
            }
          ]
        };
      },
      freeInlineCompletions: (completions: any) => {
        console.log('freeInlineCompletions called');
      },
      handleItemDidShow: (completions: any, item: any) => {
        console.log('handleItemDidShow called', item);
      },
      handlePartialAccept: (completions: any, item: any, acceptedCharacters: number) => {
        console.log('handlePartialAccept called', item);
      }
    };
  }, [suggestion, suggestionPosition]);

  // Clear current suggestion
  const clearCurrentSuggestion = useCallback(() => {
    console.log('Clearing current suggestion');
    currentSuggestionRef.current = null;
    suggestionAcceptedRef.current = false;
    if (editorRef.current) {
      // Hide any active inline suggestions
      editorRef.current.trigger('ai', 'editor.action.inlineSuggest.hide', null);
    }
  }, []);

  // Accept current suggestion
  const acceptCurrentSuggestion = useCallback(() => {
    if (!editorRef.current || !monacoRef.current || !currentSuggestionRef.current) {
      console.log('Cannot accept suggestion - missing refs');
      return false;
    }

    // Prevent double acceptance
    if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      console.log('Already accepting/accepted suggestion, skipping');
      return false;
    }

    // Set flags immediately to prevent re-entry
    isAcceptingSuggestionRef.current = true;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const currentSuggestion = currentSuggestionRef.current;

    try {
      // Clean the suggestion text (remove \r characters)
      const cleanSuggestionText = currentSuggestion.text.replace(/\r/g, '');
      
      console.log('Accepting suggestion:', cleanSuggestionText.substring(0, 50) + '...');

      // Get current cursor position to validate
      const currentPosition = editor.getPosition();
      const suggestionPos = currentSuggestion.position;

      // Verify we're still at the suggestion position
      if (currentPosition.lineNumber !== suggestionPos.line || 
          currentPosition.column < suggestionPos.column ||
          currentPosition.column > suggestionPos.column + 5) {
        console.log('Position changed, cannot accept suggestion');
        return false;
      }

      // Insert the suggestion text at the correct position
      const range = new monaco.Range(
        suggestionPos.line,
        suggestionPos.column,
        suggestionPos.line,
        suggestionPos.column
      );

      // Use executeEdits to insert the text
      const success = editor.executeEdits('ai-suggestion-accept', [
        {
          range: range,
          text: cleanSuggestionText,
          forceMoveMarkers: true
        }
      ]);

      if (!success) {
        console.error('Failed to execute edit');
        return false;
      }

      // Calculate new cursor position
      const lines = cleanSuggestionText.split('\n');
      const endLine = suggestionPos.line + lines.length - 1;
      const endColumn = lines.length === 1 
        ? suggestionPos.column + cleanSuggestionText.length
        : lines[lines.length - 1].length + 1;

      // Move cursor to end of inserted text
      editor.setPosition({ lineNumber: endLine, column: endColumn });

      console.log('Suggestion accepted successfully, new position:', `${endLine}:${endColumn}`);

      // Clear the suggestion
      clearCurrentSuggestion();

      // Set accepted flag
      suggestionAcceptedRef.current = true;

      // Call the parent's accept handler
      onAcceptSuggestion(editor, monaco);

      return true;
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      return false;
    } finally {
      // Reset accepting flag immediately
      isAcceptingSuggestionRef.current = false;
      
      // Reset accepted flag after a delay
      setTimeout(() => {
        suggestionAcceptedRef.current = false;
      }, 500);
    }
  }, [clearCurrentSuggestion, onAcceptSuggestion]);
  
  // Check if there's an active inline suggestion at current position
  const hasActiveSuggestionAtPosition = useCallback(() => {
    if (!editorRef.current || !currentSuggestionRef.current) return false;

    const position = editorRef.current.getPosition();
    const suggestion = currentSuggestionRef.current;

    return position.lineNumber === suggestion.position.line && 
           position.column >= suggestion.position.column &&
           position.column <= suggestion.position.column + 2;
  }, []);

  // Update inline completions when suggestion changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    console.log('Suggestion changed', { 
      hasSuggestion: !!suggestion, 
      hasPosition: !!suggestionPosition,
      isAccepting: isAcceptingSuggestionRef.current,
      suggestionAccepted: suggestionAcceptedRef.current
    });

    // Don't update if we're in the middle of accepting a suggestion
    if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      console.log('Skipping update - currently accepting/accepted suggestion');
      return;
    }

    // Dispose previous provider
    if (inlineCompletionProviderRef.current) {
      inlineCompletionProviderRef.current.dispose();
      inlineCompletionProviderRef.current = null;
    }

    // Clear current suggestion reference
    currentSuggestionRef.current = null;

    // Register new provider if we have a suggestion
    if (suggestion && suggestionPosition) {
      console.log('Registering new inline completion provider');
      
      const language = getEditorLanguage(activeFile?.fileExtension || "");
      const provider = createInlineCompletionProvider(monaco);
      
      inlineCompletionProviderRef.current = monaco.languages.registerInlineCompletionsProvider(
        language,
        provider
      );

      // Small delay to ensure editor is ready, then trigger suggestions
      setTimeout(() => {
        if (editorRef.current && !isAcceptingSuggestionRef.current && !suggestionAcceptedRef.current) {
          console.log('Triggering inline suggestions');
          editor.trigger('ai', 'editor.action.inlineSuggest.trigger', null);
        }
      }, 50);
    }

    return () => {
      if (inlineCompletionProviderRef.current) {
        inlineCompletionProviderRef.current.dispose();
        inlineCompletionProviderRef.current = null;
      }
    };
  }, [suggestion, suggestionPosition, activeFile, createInlineCompletionProvider]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    console.log("Editor instance mounted:", !!editorRef.current);
    
    editor.updateOptions({
      ...defaultEditorOptions,
      // Enable inline suggestions
      inlineSuggest: {
        enabled: true,
        mode: 'prefix',
        suppressSuggestions: false,
      },
      // Enable ghost text and suggestions
      suggest: {
        preview: true,
        showInlineDetails: true,
        insertMode: 'replace',
      },
      // Quick suggestions
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      // Smooth cursor
      cursorSmoothCaretAnimation: 'on',
    });

    configureMonaco(monaco);

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      console.log("Ctrl+Space pressed, triggering suggestion");
      onTriggerSuggestion("completion", editor);
    });    // Tab to accept inline suggestion - OVERRIDE the default tab behavior
    editor.addCommand(monaco.KeyCode.Tab, () => {
      console.log("Tab pressed", { 
        hasSuggestion: !!currentSuggestionRef.current,
        hasActiveSuggestion: hasActiveSuggestionAtPosition(),
        isAccepting: isAcceptingSuggestionRef.current,
        suggestionAccepted: suggestionAcceptedRef.current
      });

      // If we're already in the process of accepting, ignore
      if (isAcceptingSuggestionRef.current) {
        console.log("Already in the process of accepting, ignoring Tab");
        return;
      }

      // If the suggestion was just accepted, use default tab behavior
      if (suggestionAcceptedRef.current) {
        console.log("Suggestion was just accepted, using default tab");
        editor.trigger('keyboard', 'tab', null);
        return;
      }

      // If we have an active suggestion at the current position, try to accept it
      if (currentSuggestionRef.current && hasActiveSuggestionAtPosition()) {
        console.log("Attempting to accept suggestion with Tab");
        const accepted = acceptCurrentSuggestion();
        if (accepted) {
          console.log("Suggestion accepted via Tab, preventing default behavior");
          return;
        }
        // If acceptance failed, fall through to default behavior
      }

      // Default tab behavior (indentation)
      console.log("Using default tab behavior");
      editor.trigger('keyboard', 'tab', null);
    });


    
    // Escape to reject
    editor.addCommand(monaco.KeyCode.Escape, () => {
      console.log("Escape pressed");
      if (currentSuggestionRef.current) {
        onRejectSuggestion(editor);
        clearCurrentSuggestion();
      }
    });

    // Listen for cursor position changes to hide suggestions when moving away
    editor.onDidChangeCursorPosition((e: any) => {
      if (isAcceptingSuggestionRef.current) return;

      const newPosition = e.position;
      const lastPosition = lastCursorPositionRef.current;
      
      // Update last cursor position
      lastCursorPositionRef.current = { line: newPosition.lineNumber, column: newPosition.column };

      // Clear existing suggestion if cursor moved away
      if (currentSuggestionRef.current && !suggestionAcceptedRef.current) {
        const suggestionPos = currentSuggestionRef.current.position;
        
        // If cursor moved away from suggestion position, clear it
        if (newPosition.lineNumber !== suggestionPos.line || 
            newPosition.column < suggestionPos.column ||
            newPosition.column > suggestionPos.column + 10) { // Increased tolerance
          console.log('Cursor moved away from suggestion, clearing');
          clearCurrentSuggestion();
          onRejectSuggestion(editor);
        }
      }

      // Check if we should trigger a new context-aware suggestion
      if (lastPosition && 
          !currentSuggestionRef.current &&
          !suggestionLoading &&
          (newPosition.lineNumber !== lastPosition.line || 
           Math.abs(newPosition.column - lastPosition.column) > 2)) {
        
        // Trigger suggestion when:
        // 1. Moving to a new line
        // 2. Significant cursor movement (more than 2 columns)
        triggerContextAwareSuggestion(editor, newPosition);
      }
    });

    // Listen for content changes to detect manual typing over suggestions
    editor.onDidChangeModelContent((e: any) => {
      if (isAcceptingSuggestionRef.current) return;

      // If user types while there's a suggestion, clear it (unless it's our insertion)
      if (currentSuggestionRef.current && e.changes.length > 0 && !suggestionAcceptedRef.current) {
        const change = e.changes[0];
        
        // Check if this is our own suggestion insertion
        if (change.text === currentSuggestionRef.current.text || 
            change.text === currentSuggestionRef.current.text.replace(/\r/g, '')) {
          console.log("Our suggestion was inserted, not clearing");
          return;
        }

        // User typed something else, clear the suggestion
        console.log('User typed while suggestion active, clearing');
        clearCurrentSuggestion();
      }

      // Reset suggestion accepted flag after some typing
      if (suggestionAcceptedRef.current && e.changes.length > 0) {
        setTimeout(() => {
          suggestionAcceptedRef.current = false;
        }, 500);
      }

      // Trigger context-aware suggestions on certain typing patterns
      if (e.changes.length > 0 && !suggestionAcceptedRef.current) {
        const change = e.changes[0];
        const position = editor.getPosition();
        
        // Trigger suggestions after specific characters
        if (change.text === '\n' || // New line
            change.text === '{' ||  // Opening brace
            change.text === '.' ||  // Dot notation
            change.text === '=' ||  // Assignment
            change.text === '(' ||  // Function call
            change.text === ',' ||  // Parameter separator
            change.text === ':' ||  // Object property
            change.text === ';') {  // Statement end
          
          setTimeout(() => {
            if (editorRef.current && !currentSuggestionRef.current && !suggestionLoading) {
              triggerContextAwareSuggestion(editor, position);
            }
          }, 100); // Small delay to let the change settle
        }
      }
    });

    updateEditorLanguage();
  };

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const language = getEditorLanguage(activeFile.fileExtension || "");
    try {
      monacoRef.current.editor.setModelLanguage(model, language);
    } catch (error) {
      console.warn("Failed to set editor language:", error);
    }
  };

  useEffect(() => {
    updateEditorLanguage();
  }, [activeFile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSuggestionTimeout();
      if (inlineCompletionProviderRef.current) {
        inlineCompletionProviderRef.current.dispose();
        inlineCompletionProviderRef.current = null;
      }
    };
  }, [clearSuggestionTimeout]);

  return (
    <div className="h-full relative">
      {/* Loading indicator */}
      {suggestionLoading && (
        <div className="absolute top-2 right-2 z-10 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          AI thinking...
        </div>
      )}
      
      {/* Active suggestion indicator */}
      {currentSuggestionRef.current && !suggestionLoading && (
        <div className="absolute top-2 right-2 z-10 bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Press Tab to accept
        </div>
      )}
      
      <Editor
        height="100%"
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={
          activeFile
            ? getEditorLanguage(activeFile.fileExtension || "")
            : "plaintext"
        }
        // @ts-ignore
        options={defaultEditorOptions}
      />
    </div>
  );
};