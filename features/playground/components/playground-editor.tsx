import { useRef, useEffect } from 'react';
import Editor, { type Monaco } from "@monaco-editor/react";
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '@/features/playground/libs/editor-config';
import { AISuggestionOverlay } from './ai-suggestion-overlay';
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

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    console.log("Editor instance mounted:", !!editorRef.current);

    editor.updateOptions(defaultEditorOptions);
    configureMonaco(monaco);

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      console.log("Ctrl+Space pressed, triggering suggestion");
      onTriggerSuggestion("completion", editor);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      console.log("Ctrl+Enter pressed, accepting suggestion");
      onAcceptSuggestion(editor, monaco);
    });

    editor.addCommand(monaco.KeyCode.Escape, () => {
      console.log("Escape pressed, rejecting suggestion");
      if (suggestion) onRejectSuggestion(editor);
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

  return (
    <div className="h-full relative">
      <AISuggestionOverlay
        suggestion={suggestion}
        isLoading={suggestionLoading}
        suggestionType="completion"
        suggestionPosition={suggestionPosition}
        onAccept={() => onAcceptSuggestion(editorRef.current, monacoRef.current)}
        onReject={() => onRejectSuggestion(editorRef.current)}
      />

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