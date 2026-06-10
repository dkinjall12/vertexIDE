"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
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
import { findFilePath } from "@/features/playground/libs";
import LoadingStep from "@/components/ui/loader";
import {
  configureMonaco,
  defaultEditorOptions,
} from "@/features/playground/libs/editor-config"; // Adjust path accordingly

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

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [selectedFile, setSelectedFile] = useState<TemplateFile | null>(null);
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(
    null
  );
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
   const { serverUrl, isLoading, error:containerError, instance ,writeFileSync} = useWebContainer({ templateData })

  //* +++++++++++++++++++++++ Fetch playground metadata and template ++++++++++++++++++++++++++++++
  const fetchPlaygroundTemplateData = async () => {
    if (!id) return;
    try {
      setLoadingStep(1);
      setError(null);
      const data = await getPlaygroundById(id);
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

  //! +++++++++++++++++++++++ Fetch playground metadata and template end Here ++++++++++++++++++++++++++++++

  // * +++++++++++++++++++++++ File Management ++++++++++++++++++++++++++++++
  const handleFileSelect = (file: TemplateFile) => {
    if (!file) return;
    setSelectedFile(file);
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
  // ! +++++++++++++++++++++++++++ Fetch File Management Ends Here +++++++++++++++++++++++++++++++

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions(defaultEditorOptions);
    configureMonaco(monaco);
    updateEditorLanguage(); // Re-add this to set correct language
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

  // *--- SAVE handler: update file, sync with webcontainer, then persist
  const handleSave = async () => {
    if (!selectedFile || !templateData) return;

    try {
      const updatedTemplateData: TemplateFolder = JSON.parse(
        JSON.stringify(templateData)
      );

      const updateFileContent = (
        items: (TemplateFile | TemplateFolder)[]
      ): (TemplateFile | TemplateFolder)[] => {
        return items.map((item) => {
          if ("folderName" in item) {
            return {
              ...item,
              items: updateFileContent(item.items),
            };
          } else {
            if (
              item.filename === selectedFile.filename &&
              item.fileExtension === selectedFile.fileExtension
            ) {
              return {
                ...item,
                content: editorContent,
              };
            }
            return item;
          }
        });
      };

      updatedTemplateData.items = updateFileContent(updatedTemplateData.items);
      setTemplateData(updatedTemplateData);

      const findFile = (
        items: (TemplateFile | TemplateFolder)[]
      ): TemplateFile | null => {
        for (const item of items) {
          if ("folderName" in item) {
            const found = findFile(item.items);
            if (found) return found;
          } else if (
            item.filename === selectedFile.filename &&
            item.fileExtension === selectedFile.fileExtension
          ) {
            return item;
          }
        }
        return null;
      };

      const updatedFile = findFile(updatedTemplateData.items);
      if (updatedFile) {
        setSelectedFile(updatedFile);
      } else {
        toast.error("Failed to update selected file after saving.");
      }

      const path = findFilePath(selectedFile, updatedTemplateData);
      if (!path) {
        toast.error("Could not determine file path for webcontainer sync.");
        return;
      }

      await writeFileSync(path, editorContent);
      await SaveUpdatedCode(id, updatedTemplateData);

      toast.success(
        `Saved ${selectedFile.filename}.${selectedFile.fileExtension}`
      );
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
                <WebContainerPreview
                  templateData={templateData}
                  error={containerError!}
                  instance={instance!}
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
