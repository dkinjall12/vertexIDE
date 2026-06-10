"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TemplateFileTree } from "@/features/playground/components/playground-explorer";
import type { TemplateFile } from "@/features/playground/libs/path-to-json";
import { useParams } from "next/navigation";
import { getPlaygroundById, SaveUpdatedCode } from "@/features/playground/actions";
import { toast } from "sonner";
import { Loader2, FileText, FolderOpen, AlertCircle, Save } from "lucide-react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import WebContainerPreview from "@/features/webcontainers/components/webcontainer-preveiw";
import { useWebContainer } from "@/features/webcontainers/hooks/useWebContainer";

interface PlaygroundData {
  id: string;
  name?: string;
  [key: string]: any;
}

export interface TemplateFolder {
  folderName: string;
  items: (TemplateFile | TemplateFolder)[];
}

// Helper: Find file path in the tree, returns relative path as string
function findFilePath(
  file: TemplateFile,
  folder: TemplateFolder,
  pathSoFar: string[] = []
): string | null {
  for (const item of folder.items) {
    if ("folderName" in item) {
      const res = findFilePath(file, item, [...pathSoFar, item.folderName]);
      if (res) return res;
    } else {
      if (
        item.filename === file.filename &&
        item.fileExtension === file.fileExtension
      ) {
        return [
          ...pathSoFar,
          item.filename + (item.fileExtension ? "." + item.fileExtension : ""),
        ].join("/");
      }
    }
  }
  return null;
}
interface LoadingStepProps {
  currentStep: number;
  step: number;
  label: string;
}
const LoadingStep: React.FC<LoadingStepProps> = ({
  currentStep,
  step,
  label,
}) => (
  <div className="flex items-center gap-2 mb-2 justify-center h-screen">
    <div
      className={`rounded-full p-1 ${
        currentStep === step
          ? "bg-red-100"
          : currentStep > step
          ? "bg-green-100"
          : "bg-gray-100"
      }`}
    >
      {currentStep > step ? (
        <svg
          className="h-4 w-4 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : currentStep === step ? (
        <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
      ) : (
        <div className="h-4 w-4 rounded-full bg-gray-300" />
      )}
    </div>
    <span
      className={`text-sm ${
        currentStep === step
          ? "text-red-600 font-medium"
          : currentStep > step
          ? "text-green-600"
          : "text-gray-500"
      }`}
    >
      {label}
    </span>
  </div>
);

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [selectedFile, setSelectedFile] = useState<TemplateFile | null>(null);
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null);
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
   const { serverUrl, isLoading, error:containerError, instance ,writeFileSync} = useWebContainer({ templateData })
 

  // --- Fetch playground metadata and template
  const fetchPlaygroundTemplateData = async () => {
    if (!id) return;
    try {
      setLoadingStep(1);
      setError(null);
      const data = await getPlaygroundById(id);
      setPlaygroundData(data);
      const rawContent = data?.templateFiles?.[0]?.content;
      if (rawContent) {
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

  useEffect(() => {
    if (id) fetchPlaygroundTemplateData();
  }, [id]);

  useEffect(() => {
    if (playgroundData && id && playgroundData.templateFiles?.length < 0) {
      loadTemplate();
    }
  }, [playgroundData, id]);

  useEffect(() => {
    if (selectedFile) {
      setEditorContent(selectedFile.content || "");
      if (monacoRef.current && editorRef.current) {
        updateEditorLanguage();
      }
    }
  }, [selectedFile]);

  const handleFileSelect = (file: TemplateFile) => {
    if (!file) return;
    setSelectedFile(file);
    toast.info(`Opened ${file.filename}.${file.fileExtension}`);
  };

  const handleAddFile = (newFile: TemplateFile, parentPath: string) => {
    if (!templateData) return;
    const updatedTemplateData = JSON.parse(
      JSON.stringify(templateData)
    ) as TemplateFolder;
    if (!parentPath) {
      updatedTemplateData.items.push(newFile);
      setTemplateData(updatedTemplateData);
      toast.success(
        `Created file: ${newFile.filename}.${newFile.fileExtension}`
      );
      setSelectedFile(newFile);
      return;
    }
    const pathParts = parentPath.split("/");
    let currentFolder = updatedTemplateData;
    for (const part of pathParts) {
      const folder = currentFolder.items.find(
        (item) => "folderName" in item && item.folderName === part
      ) as TemplateFolder | undefined;
      if (!folder) {
        toast.error(`Folder not found: ${part}`);
        return;
      }
      currentFolder = folder;
    }
    currentFolder.items.push(newFile);
    setTemplateData(updatedTemplateData);
    toast.success(`Created file: ${newFile.filename}.${newFile.fileExtension}`);
    setSelectedFile(newFile);
  };

  const handleAddFolder = (newFolder: TemplateFolder, parentPath: string) => {
    if (!templateData) return;
    const updatedTemplateData = JSON.parse(
      JSON.stringify(templateData)
    ) as TemplateFolder;
    if (!parentPath) {
      updatedTemplateData.items.push(newFolder);
      setTemplateData(updatedTemplateData);
      toast.success(`Created folder: ${newFolder.folderName}`);
      return;
    }
    const pathParts = parentPath.split("/");
    let currentFolder = updatedTemplateData;
    for (const part of pathParts) {
      const folder = currentFolder.items.find(
        (item) => "folderName" in item && item.folderName === part
      ) as TemplateFolder | undefined;
      if (!folder) {
        toast.error(`Folder not found: ${part}`);
        return;
      }
      currentFolder = folder;
    }
    currentFolder.items.push(newFolder);
    setTemplateData(updatedTemplateData);
    toast.success(`Created folder: ${newFolder.folderName}`);
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      folding: true,
      lineNumbers: "on",
      wordWrap: "on",
    });
    monaco.editor.defineTheme("v0-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "keyword", foreground: "C586C0" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "regexp", foreground: "D16969" },
        { token: "type", foreground: "4EC9B0" },
        { token: "class", foreground: "4EC9B0" },
        { token: "function", foreground: "DCDCAA" },
        { token: "variable", foreground: "9CDCFE" },
        { token: "variable.predefined", foreground: "4FC1FF" },
      ],
      colors: {
        "editor.background": "#1E1E1E",
        "editor.foreground": "#D4D4D4",
        "editorCursor.foreground": "#AEAFAD",
        "editor.lineHighlightBackground": "#2D2D30",
        "editorLineNumber.foreground": "#858585",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",
      },
    });
    monaco.editor.setTheme("v0-dark");
    updateEditorLanguage();
  };

  const updateEditorLanguage = () => {
    if (!selectedFile || !monacoRef.current || !editorRef.current) return;
    const extension = selectedFile.fileExtension?.toLowerCase() ?? "";
    let language = "plaintext";
    switch (extension) {
      case "js":
      case "jsx":
        language = "javascript";
        break;
      case "ts":
      case "tsx":
        language = "typescript";
        break;
      case "json":
        language = "json";
        break;
      case "html":
      case "htm":
        language = "html";
        break;
      case "css":
        language = "css";
        break;
      case "scss":
        language = "scss";
        break;
      case "less":
        language = "less";
        break;
      case "md":
        language = "markdown";
        break;
      case "yaml":
      case "yml":
        language = "yaml";
        break;
      case "py":
        language = "python";
        break;
      case "go":
        language = "go";
        break;
      case "java":
        language = "java";
        break;
      case "c":
        language = "c";
        break;
      case "cpp":
      case "cc":
      case "cxx":
        language = "cpp";
        break;
      case "cs":
        language = "csharp";
        break;
      case "php":
        language = "php";
        break;
      case "rb":
        language = "ruby";
        break;
      case "rs":
        language = "rust";
        break;
      case "swift":
        language = "swift";
        break;
      case "sh":
      case "bash":
        language = "shell";
        break;
      case "sql":
        language = "sql";
        break;
      case "xml":
        language = "xml";
        break;
      default:
        language = "plaintext";
    }
    monacoRef.current.editor.setModelLanguage(
      editorRef.current.getModel(),
      language
    );
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, editorContent, templateData]);

  // --- SAVE handler: update file, sync with webcontainer, then persist
 const handleSave = async () => {
  if (!selectedFile || !templateData) return;

  try {
    // Deep clone templateData to avoid direct state mutation
    const updatedTemplateData: TemplateFolder = JSON.parse(
      JSON.stringify(templateData)
    );

    // Helper: Recursively find and update the selected file
    const updateFileContent = (items: (TemplateFile | TemplateFolder)[]) => {
      return items.map((item) => {
        if ("folderName" in item) {
          // Recurse into folder
          return {
            ...item,
            items: updateFileContent(item.items),
          };
        } else {
          if (
            item.filename === selectedFile.filename &&
            item.fileExtension === selectedFile.fileExtension
          ) {
            // Match by filename + extension instead of reference
            return {
              ...item,
              content: editorContent,
            };
          }
          return item;
        }
      });
    };

    // Apply the update
    updatedTemplateData.items = updateFileContent(updatedTemplateData.items);
    setTemplateData(updatedTemplateData);

    // Find path based on updated data
    const path = findFilePath(selectedFile, updatedTemplateData);
    if (!path) {
      toast.error("Could not determine file path for webcontainer sync.");
      return;
    }

    // Sync to WebContainer virtual filesystem
    await writeFileSync(path, editorContent);

    // Save updated structure to backend
    await SaveUpdatedCode(id, updatedTemplateData);

    setSelectedFile({ ...updatedTemplateData.items.find((item) => {
      if ("filename" in item) {
        return (
          item.filename === selectedFile.filename &&
          item.fileExtension === selectedFile.fileExtension
        );
      }
      return false;
    }) as TemplateFile });

    toast.success(`Saved ${selectedFile.filename}.${selectedFile.fileExtension}`);
  } catch (error) {
    console.error("Error saving file:", error);
    toast.error("Failed to save file");
  }
};

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchPlaygroundTemplateData();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
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
        <button
          onClick={loadTemplate}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Reload Template
        </button>
      </div>
    );
  }

  return (
    <>
      <TemplateFileTree
        data={templateData}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile || undefined}
        title="Template Explorer"
        onAddFile={handleAddFile}
        onAddFolder={handleAddFolder}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-col flex-1">
            <h1 className="text-sm font-medium">
              {selectedFile
                ? `${selectedFile.filename}.${selectedFile.fileExtension}`
                : "Select a file"}
            </h1>
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                {editorContent ? editorContent.length : 0} characters
              </p>
            )}
          </div>
          {selectedFile && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          )}
        </header>
        <div className="h-[calc(100vh-4rem)]">
          {selectedFile ? (
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full max-w-screen"
            >
              <ResizablePanel>
                <Editor
                  height="100%"
                  value={editorContent}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                  options={{
                    readOnly: false,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    fontSize: 20,
                    automaticLayout: true,
                    folding: true,
                    foldingStrategy: "auto",
                    showFoldingControls: "always",
                    lineNumbers: "on",
                    lineDecorationsWidth: 10,
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnCommitCharacter: true,
                    wordBasedSuggestions: "allDocuments",
                    quickSuggestions: true,
                    scrollbar: {
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10,
                      useShadows: true,
                    },
                    bracketPairColorization: {
                      enabled: true,
                    },
                    guides: {
                      bracketPairs: true,
                      indentation: true,
                    },
                    padding: {
                      top: 10,
                      bottom: 10,
                    },
                  }}
                  // Don't set defaultLanguage here, we'll set it dynamically in updateEditorLanguage
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel>
                <WebContainerPreview templateData={templateData} 
                error={containerError}
                instance={instance}
                isLoading={isLoading}
                serverUrl={serverUrl!}
                writeFileSync={writeFileSync}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4">
              <FileText className="h-16 w-16 text-gray-300" />
              <div className="text-center">
                <p className="text-lg font-medium">No file selected</p>
                <p className="text-sm text-gray-500">
                  Select a file from the sidebar to view its content
                </p>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </>
  );
};

export default MainPlaygroundPage;