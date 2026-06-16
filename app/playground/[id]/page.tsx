"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TemplateFileTree } from "@/features/playground/components/playground-explorer";
import type { TemplateFile } from "@/features/playground/libs/path-to-json";
import { useParams } from "next/navigation";
import {
  getPlaygroundById,
  SaveUpdatedCode,
} from "@/features/playground/actions";
import { toast } from "sonner";
import {
  FileText,
  FolderOpen,
  AlertCircle,
  Save,
  X,
  Settings,
  Loader2,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import WebContainerPreview from "@/features/webcontainers/components/webcontainer-preveiw";
import LoadingStep from "@/components/ui/loader";
import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "@/features/playground/libs/editor-config";
import dynamic from "next/dynamic";
import { findFilePath, generateFileId } from "@/features/playground/libs";
import { useWebContainer } from "@/features/webcontainers/hooks/useWebContainer";
import type { TemplateFolder } from "@/features/playground/libs/path-to-json";
import { AISuggestionOverlay } from "@/features/playground/components/ai-suggestion-overlay";
import { useFileExplorer } from "@/features/playground/hooks/useFileExplorer";
import { Terminal as XTerm } from '@xterm/xterm'

// Dynamic imports for components that don't need SSR

interface PlaygroundData {
  id: string;
  name?: string;
  [key: string]: any;
}

interface ConfirmationDialog {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Add a state to track WebContainer initialization
  const [isWebContainerInitialized, setIsWebContainerInitialized] =
    useState(false);

  // Core state
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(
    null
  );

  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
 const [terminal, setTerminal] = useState<XTerm | null>(null)

  // Handle terminal ready
  const handleTerminalReady = useCallback((xterm: XTerm) => {
    setTerminal(xterm)
  }, [])
  // Multi-file editor state

  // UI state
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialog>({
      isOpen: false,
      title: "",
      description: "",
      onConfirm: () => {},
      onCancel: () => {},
    });
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  // AI Suggestion state
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState<{
    line: number;
    column: number;
  } | null>(null);
  const [suggestionDecoration, setSuggestionDecoration] = useState<string[]>(
    []
  );
  const [suggestionType, setSuggestionType] = useState<string>("completion");
  const [isAISuggestionsEnabled, setIsAISuggestionsEnabled] = useState(true);
  // Refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedContent = useRef<Map<string, string>>(new Map());
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    activeFileId,
    closeAllFiles,
    openFile,
    closeFile,
    editorContent,
    updateFileContent,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    openFiles,
    setTemplateData,
    templateData,
    setEditorContent,
    setOpenFiles,
    setActiveFileId,
    setPlaygroundId,
  } = useFileExplorer();



  // WebContainer hook
  const {
    serverUrl,
    isLoading: containerLoading,
    error: containerError,
    instance,
    writeFileSync,
    destroy, // Ensure your WebContainer hook provides a destroy function
  } = useWebContainer({
    templateData,
  });


  const fetchCodeSuggestion = async (suggestionType: string = "completion") => {
    if (!isAISuggestionsEnabled || !activeFile || !editorRef.current) return;

    const model = editorRef.current.getModel();
    const cursorPosition = editorRef.current.getPosition();

    const fileContent = model.getValue(); // Get full file content
    const cursorLine = cursorPosition.lineNumber - 1; // Convert to 0-based index
    const cursorColumn = cursorPosition.column - 1; // Same here

    try {
      const response = await fetch("/api/code-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileContent,
          cursorLine,
          cursorColumn,
          suggestionType: suggestionType,
        }),
      });

      const data = await response.json();

      if (data.suggestion && editorRef.current) {
        const suggestionText = data.suggestion.trim();
        setSuggestion(suggestionText);
        setSuggestionPosition({
          line: cursorPosition.lineNumber,
          column: cursorPosition.column,
        });

        // Highlight the suggestion as ghost text
        applyGhostText(
          editorRef.current,
          suggestionText,
          cursorPosition.lineNumber,
          cursorPosition.column
        );
      }
    } catch (error) {
      console.error("Error fetching code suggestion:", error);
    }
  };
  const applyGhostText = (
    editor: any,
    suggestion: string,
    lineNumber: number,
    column: number
  ) => {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Validate lineNumber
    const totalLines = model.getLineCount();
    if (lineNumber < 1 || lineNumber > totalLines) {
      console.error(
        `Invalid lineNumber: ${lineNumber}. Total lines: ${totalLines}`
      );
      return;
    }

    const endOfLine = model.getLineMaxColumn(lineNumber);

    if (!monacoRef.current) return;

    const decoration = [
      {
        range: new monacoRef.current.Range(
          lineNumber,
          column,
          lineNumber,
          endOfLine
        ),
        options: {
          isWholeLine: false,
          inlineClassName: "ghost-text",
          hoverMessage: { value: `💡 AI Suggestion: ${suggestion}` },
        },
      },
    ];

    const newDecorations = editor.deltaDecorations(
      suggestionDecoration,
      decoration
    );
    setSuggestionDecoration(newDecorations);
  };

  // Initialize WebContainer only once
  useEffect(() => {
    if (!isWebContainerInitialized && instance) {
      setIsWebContainerInitialized(true);
    }
  }, [instance, isWebContainerInitialized]);

  // Cleanup WebContainer instance when exiting the playground
  useEffect(() => {
    return () => {
      if (isWebContainerInitialized && destroy) {
        destroy(); // Destroy the WebContainer instance
      }
    };
  }, [isWebContainerInitialized, destroy]);

  // Get active file
  const activeFile = openFiles.find((file) => file.id === activeFileId);

  // Check if there are any unsaved changes
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

  // Fetch playground data
  const fetchPlaygroundTemplateData = async () => {
    if (!id) return;

    try {
      setLoadingStep(1);
      setError(null);

      const data = await getPlaygroundById(id);
      // @ts-ignore
      setPlaygroundData(data);

      const rawContent = data?.templateFiles?.[0]?.content;
      if (typeof rawContent === "string") {
        const parsedContent = JSON.parse(rawContent);
        setTemplateData(parsedContent);
        setLoadingStep(3);
        toast.success("Loaded template from saved content");
        return;
      }

      setLoadingStep(2);
      toast.success("Playground metadata loaded");
      await loadTemplate();
    } catch (error) {
      console.error("Error loading playground:", error);
      setError("Failed to load playground data");
      toast.error("Failed to load playground data");
    }
  };

  const loadTemplate = async () => {
    if (!id) return;

    try {
      setLoadingStep(2);
      const res = await fetch(`/api/template/${id}`);

      if (!res.ok) throw new Error(`Failed to load template: ${res.status}`);

      const data = await res.json();

      if (data.templateJson && Array.isArray(data.templateJson)) {
        setTemplateData({
          folderName: "Root",
          items: data.templateJson,
        });
      } else {
        setTemplateData(
          data.templateJson || {
            folderName: "Root",
            items: [],
          }
        );
      }

      setLoadingStep(3);
      toast.success("Template loaded successfully");
    } catch (error) {
      console.error("Error loading template:", error);
      setError("Failed to load template data");
      toast.error("Failed to load template data");
    }
  };

  // File management functions

  const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  // Editor functions
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.updateOptions(defaultEditorOptions);
    configureMonaco(monaco);

    // Add AI suggestion keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      fetchCodeSuggestion("completion");
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      acceptCurrentSuggestion();
    });

    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (suggestion) {
        rejectCurrentSuggestion();
      }
    });

    // Add CSS for ghost text
    const style = document.createElement("style");
    style.textContent = `
      .suggestion-ghost-text {
        opacity: 0.6;
      }
      .suggestion-inline-text {
        color: #888;
        font-style: italic;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
      updateEditorLanguage();
    }, 100);
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

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value || !activeFileId) return;
      updateFileContent(activeFileId, value);
    },
    [activeFileId, updateFileContent]
  );

  const acceptCurrentSuggestion = () => {
    if (
      !suggestion ||
      !suggestionPosition ||
      !editorRef.current ||
      !monacoRef.current
    )
      return;

    const { line, column } = suggestionPosition;
    const model = editorRef.current.getModel();

    // Ensure the suggestion does not include line numbers
    const sanitizedSuggestion = suggestion.replace(/^\d+:\s*/gm, ""); // Remove any line numbers

    editorRef.current.executeEdits("", [
      {
        range: new monacoRef.current.Range(line, column, line, column),
        text: sanitizedSuggestion,
        forceMoveMarkers: true,
      },
    ]);

    // Clear decorations and reset suggestion state
    editorRef.current.deltaDecorations(suggestionDecoration, []);
    setSuggestion(null);
    setSuggestionPosition(null);
    setSuggestionDecoration([]);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        acceptCurrentSuggestion();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestion, suggestionPosition]);
  // Save functions
  const handleSave = async (fileId?: string) => {
    const targetFileId = fileId || activeFileId;

    if (!targetFileId || !templateData) return;

    const fileToSave = openFiles.find((f) => f.id === targetFileId);
    if (!fileToSave) return;

    try {
      // Clone template data
      const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder;

      // Find the file's path in the template structure
      const filePath = findFilePath(fileToSave, updatedTemplateData);
      if (!filePath) {
        throw new Error(`Could not find path for file: ${fileToSave.filename}.${fileToSave.fileExtension}`);
      }

      // Update the file content in template data
      const updateFileContent = (
        items: (TemplateFile | TemplateFolder)[]
      ): (TemplateFile | TemplateFolder)[] => {
        return items.map((item) => {
          if ("folderName" in item) {
            return {
              ...item,
              items: updateFileContent(item.items),
            };
          } else if (
            item.filename === fileToSave.filename &&
            item.fileExtension === fileToSave.fileExtension
          ) {
            return {
              ...item,
              content: fileToSave.content,
            };
          }
          return item;
        });
      };

      // Update template data with new content
      updatedTemplateData.items = updateFileContent(updatedTemplateData.items);

      // Sync with WebContainer
      if (writeFileSync) {
        await writeFileSync(filePath, fileToSave.content);
        lastSyncedContent.current.set(fileToSave.id, fileToSave.content);
      }

      // Save to backend (this should update both file content and structure)
      await SaveUpdatedCode(id, updatedTemplateData);

      // Update template data in state
      setTemplateData(updatedTemplateData);

      // Update open files
      const updatedOpenFiles = openFiles.map((f) => 
        f.id === targetFileId
          ? {
              ...f,
              content: fileToSave.content,
              originalContent: fileToSave.content,
              hasUnsavedChanges: false,
            }
          : f
      );
      setOpenFiles(updatedOpenFiles);

      toast.success(`Saved ${fileToSave.filename}.${fileToSave.fileExtension}`);
    } catch (error) {
      console.error("Error saving file:", error);
      toast.error(`Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`);
      throw error; // Re-throw to handle in save all
    }
  };

  const handleSaveAll = async () => {
    const unsavedFiles = openFiles.filter((f) => f.hasUnsavedChanges);

    if (unsavedFiles.length === 0) {
      toast.info("No unsaved changes");
      return;
    }

    try {
      await Promise.all(unsavedFiles.map((f) => handleSave(f.id)));
      toast.success(`Saved ${unsavedFiles.length} file(s)`);
    } catch (error) {
      toast.error("Failed to save some files");
    }
  };

  // Run project function

  const clearSuggestion = () => {
    if (editorRef.current) {
      editorRef.current.deltaDecorations(suggestionDecoration, []);
    }
    setSuggestion(null);
    setSuggestionPosition(null);
    setSuggestionDecoration([]);
  };

  const rejectCurrentSuggestion = () => {
    clearSuggestion();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();

        if (event.shiftKey) {
          handleSaveAll();
        } else {
          handleSave(openFiles.find((f) => f.id === activeFileId)?.id);
        }
      }

      // AI suggestion shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === " ") {
        event.preventDefault();
        fetchCodeSuggestion("completion");
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        acceptCurrentSuggestion();
      }

      if (event.key === "Escape" && suggestion) {
        event.preventDefault();
        rejectCurrentSuggestion();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, openFiles, suggestion, suggestionPosition]);

  // Effects
  useEffect(() => {
    setPlaygroundId(id);

    if (id) fetchPlaygroundTemplateData();
  }, [id]);

  useEffect(() => {
    if (activeFile) {
      setEditorContent(activeFile.content);

      if (monacoRef.current && editorRef.current) {
        setTimeout(() => {
          updateEditorLanguage();
        }, 50);
      }
    }
  }, [activeFile]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  // Render loading state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button
          onClick={() => {
            setError(null);
            fetchPlaygroundTemplateData();
          }}
          variant="destructive"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (loadingStep < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Loading Playground
          </h2>
          <div className="mb-8">
            <LoadingStep
              currentStep={loadingStep}
              step={1}
              label="Loading playground metadata"
            />
            <LoadingStep
              currentStep={loadingStep}
              step={2}
              label="Loading template structure"
            />
            <LoadingStep
              currentStep={loadingStep}
              step={3}
              label="Ready to explore"
            />
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-300 ease-in-out"
              style={{ width: `${(loadingStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <FolderOpen className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-amber-600 mb-2">
          No template data available
        </h2>
        <p className="text-gray-600 mb-4">
          The template appears to be empty or in an invalid format
        </p>
        <Button onClick={loadTemplate} variant="outline">
          Reload Template
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title="File Explorer"
          onAddFile={handleAddFile}
          onAddFolder={handleAddFolder}
          onDeleteFile={handleDeleteFile}
          onDeleteFolder={handleDeleteFolder}
          onRenameFile={handleRenameFile}
          onRenameFolder={handleRenameFolder}
        />

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-col flex-1">
                <h1 className="text-sm font-medium">
                  {playgroundData?.name || "Code Playground"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {openFiles.length} file(s) open
                  {hasUnsavedChanges && " • Unsaved changes"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSave}
                      disabled={!activeFile || !activeFile.hasUnsavedChanges}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save (Ctrl+S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveAll}
                      disabled={!hasUnsavedChanges}
                    >
                      <Save className="h-4 w-4" /> All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save All (Ctrl+Shift+S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchCodeSuggestion("completion")}
                      disabled={!activeFile || suggestionLoading}
                    >
                      {suggestionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Get AI Suggestion (Ctrl+Space)
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={!activeFile}>
                      <Lightbulb className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => fetchCodeSuggestion("completion")}
                    >
                      Code Completion
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => fetchCodeSuggestion("function")}
                    >
                      Function Suggestion
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => fetchCodeSuggestion("variable")}
                    >
                      Variable Suggestion
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => fetchCodeSuggestion("import")}
                    >
                      Import Suggestion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                    >
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsTerminalVisible(!isTerminalVisible)}
                    >
                      {isTerminalVisible ? "Hide" : "Show"} Terminal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closeAllFiles}>
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={isAISuggestionsEnabled ? "outline" : "ghost"}
                        onClick={() =>
                          setIsAISuggestionsEnabled(!isAISuggestionsEnabled)
                        }
                      >
                        {isAISuggestionsEnabled ? "Disable AI" : "Enable AI"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isAISuggestionsEnabled
                        ? "Disable AI Suggestions"
                        : "Enable AI Suggestions"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </header>

          <div className="h-[calc(100vh-4rem)]">
            {openFiles.length > 0 ? (
              <div className="h-full flex flex-col">
                {/* File Tabs */}
                <div className="border-b bg-muted/30">
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={setActiveFileId}
                  >
                    <div className="flex items-center justify-between px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group"
                          >
                            <div className="flex items-center gap-2 justify-center group">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>
                                  {file.filename}.{file.fileExtension}
                                </span>
                                {file.hasUnsavedChanges && (
                                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                                )}
                              </span>
                              <span
                                className="ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={closeAllFiles}
                          className="h-6 px-2 text-xs"
                        >
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>

                {/* Editor and Preview */}
                <div className="flex-1">
                  <ResizablePanelGroup
                    direction="horizontal"
                    className="h-full"
                  >
                    <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100}>
                      <div className="h-full flex flex-col">
                        <div className="flex-1 relative">
                          {/* AI Suggestion Overlay */}
                          <AISuggestionOverlay
                            suggestion={suggestion}
                            isLoading={suggestionLoading}
                            suggestionType={suggestionType}
                            suggestionPosition={suggestionPosition}
                            onAccept={acceptCurrentSuggestion}
                            onReject={rejectCurrentSuggestion}
                          />

                          <Editor
                            height="100%"
                            value={editorContent}
                            onChange={handleEditorChange}
                            onMount={handleEditorDidMount}
                            language={
                              activeFile
                                ? getEditorLanguage(
                                    activeFile.fileExtension || ""
                                  )
                                : "plaintext"
                            }
                            options={defaultEditorOptions}
                          />
                        </div>

                        {/* {isTerminalVisible && (
                          <>
                            <ResizableHandle />
                            <div className="h-64 border-t">
                              <TerminalAsync 
                              webContainerInstance={instance}
                             webcontainerUrl={serverUrl!}  
                              />
                            </div>
                          </>
                        )} */}
                      </div>
                    </ResizablePanel>

                    {isPreviewVisible && (
                      <>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={50}>
                          <WebContainerPreview
                            templateData={templateData}
                            instance={instance}
                            writeFileSync={writeFileSync}
                            isLoading={containerLoading}
                            error={containerError}
                            serverUrl={serverUrl!}
                            forceResetup={false}
                            
                          />
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4">
                <FileText className="h-16 w-16 text-gray-300" />
                <div className="text-center">
                  <p className="text-lg font-medium">No files open</p>
                  <p className="text-sm text-gray-500">
                    Select a file from the sidebar to start editing
                  </p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmationDialog.isOpen}
          onOpenChange={(open) =>
            setConfirmationDialog((prev) => ({ ...prev, isOpen: open }))
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmationDialog.title}</DialogTitle>
              <DialogDescription>
                {confirmationDialog.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={confirmationDialog.onCancel}>
                Don't Save
              </Button>
              <Button onClick={confirmationDialog.onConfirm}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
