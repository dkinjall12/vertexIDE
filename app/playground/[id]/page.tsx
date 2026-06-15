"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { TemplateFileTree } from "@/features/playground/components/playground-explorer"
import type { TemplateFile } from "@/features/playground/libs/path-to-json"
import { useParams } from "next/navigation"
import { getPlaygroundById, SaveUpdatedCode } from "@/features/playground/actions"
import { toast } from "sonner"
import { FileText, FolderOpen, AlertCircle, Save, X, Settings, Loader2, Sparkles, Lightbulb } from "lucide-react"
import Editor, { type Monaco } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import WebContainerPreview from "@/features/webcontainers/components/webcontainer-preveiw"
import LoadingStep from "@/components/ui/loader"
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from "@/features/playground/libs/editor-config"
import dynamic from "next/dynamic"
import { findFilePath } from "@/features/playground/libs"
import { useWebContainer } from "@/features/webcontainers/hooks/useWebContainer"
import type { TemplateFolder } from "@/features/playground/libs/path-to-json"
import { AISuggestionOverlay } from "@/features/playground/components/ai-suggestion-overlay"
import { useFileExplorer } from "@/features/playground/hooks/useFileExplorer"


// Dynamic imports for components that don't need SSR
const TerminalAsync = dynamic(() => import("@/features/webcontainers/components/terminal"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted-foreground">Loading terminal...</div>
  ),
})

interface PlaygroundData {
  id: string
  name?: string
  [key: string]: any
}

interface OpenFile extends TemplateFile {
  id: string
  hasUnsavedChanges: boolean
  content: string
  originalContent: string
}

interface ConfirmationDialog {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  // Add a state to track WebContainer initialization
  const [isWebContainerInitialized, setIsWebContainerInitialized] = useState(false)

  // Core state
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null)

  const [loadingStep, setLoadingStep] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)

  // Multi-file editor state


  // UI state
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    onCancel: () => {},
  })
  const [isTerminalVisible, setIsTerminalVisible] = useState(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState(true)
  const [isRunning, setIsRunning] = useState(false)

  // AI Suggestion state
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionPosition, setSuggestionPosition] = useState<{
    line: number
    column: number
  } | null>(null)
  const [suggestionDecoration, setSuggestionDecoration] = useState<string[]>([])
  const [suggestionType, setSuggestionType] = useState<string>("completion")
  const [isAISuggestionsEnabled, setIsAISuggestionsEnabled] = useState(true);
  
  // Refs
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncedContent = useRef<Map<string, string>>(new Map())
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {activeFileId , closeAllFiles , openFile , closeFile , editorContent , updateFileContent , handleAddFile , handleAddFolder , handleDeleteFile , handleDeleteFolder,handleRenameFile,handleRenameFolder,openFiles,setTemplateData,templateData , setEditorContent , setOpenFiles ,setActiveFileId} = useFileExplorer()

  console.log("OpenFiles" , openFiles)

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
  })

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
        suggestionType: "completion",
      }),
    });

    const data = await response.json();

    if (data.suggestion && editorRef.current) {
      const suggestionText = data.suggestion.trim();
      setSuggestion(suggestionText);
      setSuggestionPosition({ line: cursorPosition.lineNumber, column: cursorPosition.column });

      // Highlight the suggestion as ghost text
      applyGhostText(editorRef.current, suggestionText, cursorPosition.lineNumber, cursorPosition.column);
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
      console.error(`Invalid lineNumber: ${lineNumber}. Total lines: ${totalLines}`);
      return;
    }

    const endOfLine = model.getLineMaxColumn(lineNumber);

    if (!monacoRef.current) return;

    const decoration = [
      {
        range: new monacoRef.current.Range(lineNumber, column, lineNumber, endOfLine),
        options: {
          isWholeLine: false,
          inlineClassName: "ghost-text",
          hoverMessage: { value: `💡 AI Suggestion: ${suggestion}` },
        },
      },
    ];

    const newDecorations = editor.deltaDecorations(suggestionDecoration, decoration);
    setSuggestionDecoration(newDecorations);
  }

  // Initialize WebContainer only once
  useEffect(() => {
    if (!isWebContainerInitialized && instance) {
      setIsWebContainerInitialized(true)
    }
  }, [instance, isWebContainerInitialized])

  // Cleanup WebContainer instance when exiting the playground
  useEffect(() => {
    return () => {
      if (isWebContainerInitialized && destroy) {
        destroy() // Destroy the WebContainer instance
      }
    }
  }, [isWebContainerInitialized, destroy])


  // Get active file
  const activeFile =  openFiles.find((file) => file.id === activeFileId) 

  // Check if there are any unsaved changes
  const hasUnsavedChanges =  openFiles.some((file) => file.hasUnsavedChanges)

  // Debounced sync to WebContainer
  const debouncedSync = useCallback(
    (file: OpenFile) => {
      if (!writeFileSync || !templateData) return

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const path = findFilePath(file, templateData)
          if (!path) {
            console.error(`Could not find path for file: ${file.filename}.${file.fileExtension}`)
            return
          }

          await writeFileSync(path, file.content)
          lastSyncedContent.current.set(file.id, file.content)
          console.log(`✅ Synced ${file.filename}.${file.fileExtension} to WebContainer`)
        } catch (error) {
          console.error("Failed to sync file to WebContainer:", error)
        }
      }, 500)
    },
    [templateData, writeFileSync],
  )

  // Auto-save functionality
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (!activeFile || !activeFile.hasUnsavedChanges) return

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(activeFile.id)
    }, 3000)
  }, [activeFile])

  // Fetch playground data
  const fetchPlaygroundTemplateData = async () => {
    if (!id) return

    try {
      setLoadingStep(1)
      setError(null)

      const data = await getPlaygroundById(id)
      // @ts-ignore
      setPlaygroundData(data)

      const rawContent = data?.templateFiles?.[0]?.content
      if (typeof rawContent === "string") {
        const parsedContent = JSON.parse(rawContent)
        setTemplateData(parsedContent)
        setLoadingStep(3)
        toast.success("Loaded template from saved content")
        return
      }

      setLoadingStep(2)
      toast.success("Playground metadata loaded")
      await loadTemplate()
    } catch (error) {
      console.error("Error loading playground:", error)
      setError("Failed to load playground data")
      toast.error("Failed to load playground data")
    }
  }

  const loadTemplate = async () => {
    if (!id) return

    try {
      setLoadingStep(2)
      const res = await fetch(`/api/template/${id}`)

      if (!res.ok) throw new Error(`Failed to load template: ${res.status}`)

      const data = await res.json()

      if (data.templateJson && Array.isArray(data.templateJson)) {
        setTemplateData({
          folderName: "Root",
          items: data.templateJson,
        })
      } else {
        setTemplateData(
          data.templateJson || {
            folderName: "Root",
            items: [],
          },
        )
      }

      setLoadingStep(3)
      toast.success("Template loaded successfully")
    } catch (error) {
      console.error("Error loading template:", error)
      setError("Failed to load template data")
      toast.error("Failed to load template data")
    }
  }

  // Fetch code suggestion
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
          suggestionType: "completion",
        }),
      });

      const data = await response.json();

      if (data.suggestion && editorRef.current) {
        const suggestionText = data.suggestion.trim();
        setSuggestion(suggestionText);
        setSuggestionPosition({ line: cursorPosition.lineNumber, column: cursorPosition.column });

        // Highlight the suggestion as ghost text
        applyGhostText(editorRef.current, suggestionText, cursorPosition.lineNumber, cursorPosition.column);
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
      console.error(`Invalid lineNumber: ${lineNumber}. Total lines: ${totalLines}`);
      return;
    }

    const endOfLine = model.getLineMaxColumn(lineNumber);

    if (!monacoRef.current) return;

    const decoration = [
      {
        range: new monacoRef.current.Range(lineNumber, column, lineNumber, endOfLine),
        options: {
          isWholeLine: false,
          inlineClassName: "ghost-text",
          hoverMessage: { value: `💡 AI Suggestion: ${suggestion}` },
        },
      },
    ];

    const newDecorations = editor.deltaDecorations(suggestionDecoration, decoration);
    setSuggestionDecoration(newDecorations);
  }

  // Open file
  const openFile = (file: TemplateFile) => {
    const fileId = generateFileId(file)
    const existingFile = openFiles.find((f) => f.id === fileId)

    if (existingFile) {
      setActiveFileId(fileId)
      setEditorContent(existingFile.content)
      return
    }

    const newOpenFile: OpenFile = {
      ...file,
      id: fileId,
      hasUnsavedChanges: false,
      content: file.content || "",
      originalContent: file.content || "",
    }

    setOpenFiles((prev) => [...prev, newOpenFile])
    setActiveFileId(fileId)
    setEditorContent(file.content || "")
  }

  // Close file
  const closeFile = (fileId: string) => {
    const file = openFiles.find((f) => f.id === fileId)

    if (file && file.hasUnsavedChanges) {
      setConfirmationDialog({
        isOpen: true,
        title: "Unsaved Changes",
        description: `You have unsaved changes in ${file.filename}.${file.fileExtension}. Do you want to save before closing?`,
        onConfirm: async () => {
          await handleSave(fileId)
          closeFileForce(fileId)
          setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))
        },
        onCancel: () => {
          closeFileForce(fileId)
          setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))
        },
      })
    } else {
      closeFileForce(fileId)
    }
  }

  // Close file forcefully
  const closeFileForce = (fileId: string) => {
    setOpenFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== fileId)
      const newActiveFile = newFiles.length > 0 ? newFiles[newFiles.length - 1] : null

      if (newActiveFile) {
        setActiveFileId(newActiveFile.id)
        setEditorContent(newActiveFile.content)
      } else {
        setActiveFileId(null)
        setEditorContent("")
      }

      return newFiles
    })

    lastSyncedContent.current.delete(fileId)
  }

  // Close all files
  const closeAllFiles = () => {
    const unsavedFiles = openFiles.filter((f) => f.hasUnsavedChanges)

    if (unsavedFiles.length > 0) {
      setConfirmationDialog({
        isOpen: true,
        title: "Unsaved Changes",
        description: `You have unsaved changes in ${unsavedFiles.length} file(s). Do you want to save all before closing?`,
        onConfirm: async () => {
          await Promise.all(unsavedFiles.map((f) => handleSave(f.id)))
          setOpenFiles([])
          setActiveFileId(null)
          setEditorContent("")
          setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))
        },
        onCancel: () => {
          setOpenFiles([])
          setActiveFileId(null)
          setEditorContent("")
          setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))
        },
      })
    } else {
      setOpenFiles([])
      setActiveFileId(null)
      setEditorContent("")
    }
  }

  // Handle file select
  const handleFileSelect = (file: TemplateFile) => {
    openFile(file)
  }

  // Handle add file
  const handleAddFile = (newFile: TemplateFile, parentPath: string) => {
    if (!templateData) return

    try {
      const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

      if (!parentPath) {
        updatedTemplateData.items.push(newFile)
        setTemplateData(updatedTemplateData)
        toast.success(`Created file: ${newFile.filename}.${newFile.fileExtension}`)
        openFile(newFile)
        return
      }

      const pathParts = parentPath.split("/")
      let currentFolder = updatedTemplateData

      for (const part of pathParts) {
        const folder = currentFolder.items.find((item) => "folderName" in item && item.folderName === part) as
          | TemplateFolder
          | undefined

        if (!folder) {
          toast.error(`Folder not found: ${part}`)
          return
        }

        currentFolder = folder
      }

      currentFolder.items.push(newFile)
      setTemplateData(updatedTemplateData)
      toast.success(`Created file: ${newFile.filename}.${newFile.fileExtension}`)
      openFile(newFile)
    } catch (error) {
      console.error("Error adding file:", error)
      toast.error("Failed to create file")
    }
  }

  // Handle add folder
  const handleAddFolder = (newFolder: TemplateFolder, parentPath: string) => {
    if (!templateData) return

    try {
      const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

      if (!parentPath) {
        updatedTemplateData.items.push(newFolder)
        setTemplateData(updatedTemplateData)
        toast.success(`Created folder: ${newFolder.folderName}`)
        return
      }

      const pathParts = parentPath.split("/")
      let currentFolder = updatedTemplateData

      for (const part of pathParts) {
        const folder = currentFolder.items.find((item) => "folderName" in item && item.folderName === part) as
          | TemplateFolder
          | undefined

        if (!folder) {
          toast.error(`Folder not found: ${part}`)
          return
        }

        currentFolder = folder
      }

      currentFolder.items.push(newFolder)
      setTemplateData(updatedTemplateData)
      toast.success(`Created folder: ${newFolder.folderName}`)
    } catch (error) {
      console.error("Error adding folder:", error)
      toast.error("Failed to create folder")
    }
  }

  // Handle delete file
  const handleDeleteFile = async (file: TemplateFile, parentPath: string) => {
    if (!templateData || !id) return

    try {
      const fileId = generateFileId(file)
      const isOpen = openFiles.some((f) => f.id === fileId)

      if (isOpen) {
        closeFileForce(fileId)
      }

      const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

      if (!parentPath) {
        updatedTemplateData.items = updatedTemplateData.items.filter(
          (item) =>
            !("filename" in item && item.filename === file.filename && item.fileExtension === file.fileExtension),
        )
        setTemplateData(updatedTemplateData)
        await SaveUpdatedCode(id, updatedTemplateData)
        toast.success(`Deleted file: ${file.filename}.${file.fileExtension}`)
        return
      }

      const pathParts = parentPath.split("/")
      let currentFolder = updatedTemplateData

      for (const part of pathParts) {
        const folder = currentFolder.items.find((item) => "folderName" in item && item.folderName === part) as
          | TemplateFolder
          | undefined

        if (!folder) {
          toast.error(`Folder not found: ${part}`)
          return
        }

        currentFolder = folder
      }

      currentFolder.items = currentFolder.items.filter(
        (item) => !("filename" in item && item.filename === file.filename && item.fileExtension === file.fileExtension),
      )

      setTemplateData(updatedTemplateData)
      await SaveUpdatedCode(id, updatedTemplateData)
      toast.success(`Deleted file: ${file.filename}.${file.fileExtension}`)
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Failed to delete file")
    }
  }

  // Handle delete folder
  const handleDeleteFolder = async (folder: TemplateFolder, parentPath: string) => {
    if (!templateData || !id) return

    try {
      const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

      if (!parentPath) {
        updatedTemplateData.items = updatedTemplateData.items.filter(
          (item) => !("folderName" in item && item.folderName === folder.folderName),
        )
        setTemplateData(updatedTemplateData)
        await SaveUpdatedCode(id, updatedTemplateData)
        toast.success(`Deleted folder: ${folder.folderName}`)
        return
      }

      const pathParts = parentPath.split("/")
      let currentFolder = updatedTemplateData

      for (const part of pathParts) {
        const targetFolder = currentFolder.items.find((item) => "folderName" in item && item.folderName === part) as
          | TemplateFolder
          | undefined

        if (!targetFolder) {
          toast.error(`Folder not found: ${part}`)
          return
        }

        currentFolder = targetFolder
      }

      currentFolder.items = currentFolder.items.filter(
        (item) => !("folderName" in item && item.folderName === folder.folderName),
      )

      setTemplateData(updatedTemplateData)
      await SaveUpdatedCode(id, updatedTemplateData)
      toast.success(`Deleted folder: ${folder.folderName}`)
    } catch (error) {
      console.error("Error deleting folder:", error)
      toast.error("Failed to delete folder")
    }
  }

  // Rename file
  const handleRenameFile = async (
    file: TemplateFile,
    newFilename: string,
    newExtension: string,
    parentPath: string,
  ) => {
    if (!templateData || !id) return

    const oldFileId = generateFileId(file)
    const newFile = { ...file, filename: newFilename, fileExtension: newExtension }
    const newFileId = generateFileId(newFile)

    const isOpen = openFiles.some((f) => f.id === oldFileId)

    if (isOpen) {
      setOpenFiles((prev) =>
        prev.map((f) => {
          if (f.id === oldFileId) {
            return { ...f, ...newFile, id: newFileId }
          }
          return f
        }),
      )

      if (activeFileId === oldFileId) {
        setActiveFileId(newFileId)
      }
    }

    const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

    const updateFileInItems = (items: (TemplateFile | TemplateFolder)[]): (TemplateFile | TemplateFolder)[] => {
      return items.map((item) => {
        if ("folderName" in item) {
          return {
            ...item,
            items: updateFileInItems(item.items),
          }
        } else {
          if (item.filename === file.filename && item.fileExtension === file.fileExtension) {
            return { ...item, filename: newFilename, fileExtension: newExtension }
          }
          return item
        }
      })
    }

    if (!parentPath) {
      updatedTemplateData.items = updateFileInItems(updatedTemplateData.items)
    } else {
      const pathParts = parentPath.split("/")
      let currentFolder = updatedTemplateData

      for (const part of pathParts) {
        const folder = currentFolder.items.find((item) => "folderName" in item && item.folderName === part) as
          | TemplateFolder
          | undefined

        if (!folder) {
          toast.error(`Folder not found: ${part}`)
          return
        }

        currentFolder = folder
      }

      currentFolder.items = updateFileInItems(currentFolder.items)
    }

    try {
      await SaveUpdatedCode(id, updatedTemplateData)
      setTemplateData(updatedTemplateData)
      toast.success(`Renamed file to: ${newFilename}.${newExtension}`)
    } catch (error) {
      console.error("Error renaming file:", error)
      toast.error("Failed to rename file")
    }
  }

  // Rename folder
  const handleRenameFolder = async (folder: TemplateFolder, newFolderName: string, parentPath: string) => {
    if (!templateData || !id) return

    const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

    if (!parentPath) {
      updatedTemplateData.items = updatedTemplateData.items.map((item) => {
        if ("folderName" in item && item.folderName === folder.folderName) {
          return { ...item, folderName: newFolderName }
        }
        return item
      })
    } else {
      const pathParts = parentPath.split("/")
      let currentFolder = updatedTemplateData

      for (const part of pathParts) {
        const targetFolder = currentFolder.items.find((item) => "folderName" in item && item.folderName === part) as
          | TemplateFolder
          | undefined

        if (!targetFolder) {
          toast.error(`Folder not found: ${part}`)
          return
        }

        currentFolder = targetFolder
      }

      currentFolder.items = currentFolder.items.map((item) => {
        if ("folderName" in item && item.folderName === folder.folderName) {
          return { ...item, folderName: newFolderName }
        }
        return item
      })
    }

    try {
      await SaveUpdatedCode(id, updatedTemplateData)
      setTemplateData(updatedTemplateData)
      toast.success(`Renamed folder to: ${newFolderName}`)
    } catch (error) {
      console.error("Error renaming folder:", error)
      toast.error("Failed to rename folder")
    }
  }

  // Editor functions
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    editor.updateOptions(defaultEditorOptions)
    configureMonaco(monaco)

    // Add AI suggestion keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      fetchCodeSuggestion("completion")
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      acceptCurrentSuggestion()
    })

    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (suggestion) {
        rejectCurrentSuggestion()
      }
    })

    // Add CSS for ghost text
    const style = document.createElement("style")
    style.textContent = `
      .suggestion-ghost-text {
        opacity: 0.6;
      }
      .suggestion-inline-text {
        color: #888;
        font-style: italic;
        opacity: 0.7;
      }
    `
    document.head.appendChild(style)

    setTimeout(() => {
      updateEditorLanguage()
    }, 100)
  }

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return

    const model = editorRef.current.getModel()
    if (!model) return

    const language = getEditorLanguage(activeFile.fileExtension || "")

    try {
      monacoRef.current.editor.setModelLanguage(model, language)
    } catch (error) {
      console.warn("Failed to set editor language:", error)
    }
  }

  // Ref for debounce timeout
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value || !activeFileId) return
    updateFileContent(activeFileId, value)
  }, [activeFileId, updateFileContent])
  const acceptCurrentSuggestion = () => {
    if (!suggestion || !suggestionPosition || !editorRef.current || !monacoRef.current) return;

    const { line, column } = suggestionPosition;
    const model = editorRef.current.getModel();

    // Ensure the suggestion does not include line numbers
    const sanitizedSuggestion = suggestion.replace(/^\d+:\s*/gm, ''); // Remove any line numbers

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
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()
        acceptCurrentSuggestion()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [suggestion, suggestionPosition])
  
  // Save functions
  const handleSave = async (fileId?: string) => {
    const targetFileId = fileId || activeFileId

    if (!targetFileId || !templateData) return

    const fileToSave = openFiles.find((f) => f.id === targetFileId)
    if (!fileToSave) return

    try {
      const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

      const updateFileContent = (items: (TemplateFile | TemplateFolder)[]): (TemplateFile | TemplateFolder)[] => {
        return items.map((item) => {
          if ("folderName" in item) {
            return {
              ...item,
              items: updateFileContent(item.items),
            }
          } else {
            if (generateFileId(item) === generateFileId(fileToSave)) {
              return {
                ...item,
                content: fileToSave.content,
              }
            }
            return item
          }
        })
      }

      updatedTemplateData.items = updateFileContent(updatedTemplateData.items)

      if (writeFileSync) {
        const path = findFilePath(fileToSave, updatedTemplateData)
        if (path) {
          await writeFileSync(path, fileToSave.content)
          lastSyncedContent.current.set(fileToSave.id, fileToSave.content)
        }
      }

      await SaveUpdatedCode(id, updatedTemplateData)

      setOpenFiles((prev) =>
        prev.map((file) =>
          file.id === targetFileId
            ? {
                ...file,
                hasUnsavedChanges: false,
                originalContent: file.content,
              }
            : file,
        ),
      )

      toast.success(`Saved ${fileToSave.filename}.${fileToSave.fileExtension}`)
    } catch (error) {
      console.error("Error saving file:", error)
      toast.error(`Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`)
    }
  }

  const handleSaveAll = async () => {
    const unsavedFiles = openFiles.filter((f) => f.hasUnsavedChanges)

    if (unsavedFiles.length === 0) {
      toast.info("No unsaved changes")
      return
    }

    try {
      await Promise.all(unsavedFiles.map((f) => handleSave(f.id)))
      toast.success(`Saved ${unsavedFiles.length} file(s)`)
    } catch (error) {
      toast.error("Failed to save some files")
    }
  }

  // Run project function
  const handleRunProject = async () => {
    if (!instance) {
      toast.error("WebContainer not ready")
      return
    }

    setIsRunning(true)

    try {
      // Save all files first
      await handleSaveAll()

      // Try to start the development server
      const installProcess = await instance.spawn("npm", ["install"])
      const installExitCode = await installProcess.exit

      if (installExitCode !== 0) {
        toast.error("Failed to install dependencies")
        return
      }

      const devProcess = await instance.spawn("npm", ["run", "dev"])
      toast.success("🚀 Project is running!")
    } catch (error) {
      console.error("Error running project:", error)
      toast.error("Failed to run project")
    } finally {
      setIsRunning(false)
    }
  }

  const clearSuggestion = () => {
    if (editorRef.current) {
      editorRef.current.deltaDecorations(suggestionDecoration, [])
    }
    setSuggestion(null)
    setSuggestionPosition(null)
    setSuggestionDecoration([])
  }

  const debouncedSuggestion = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchCodeSuggestion()
    }, 500)
  }

  const rejectCurrentSuggestion = () => {
    clearSuggestion()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault()

        if (event.shiftKey) {
          handleSaveAll()
        } else {
          handleSave()
        }
      }

      // AI suggestion shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === " ") {
        event.preventDefault()
        fetchCodeSuggestion("completion")
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()
        acceptCurrentSuggestion()
      }

      if (event.key === "Escape" && suggestion) {
        event.preventDefault()
        rejectCurrentSuggestion()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [suggestion])

  // Effects
  useEffect(() => {
    if (id) fetchPlaygroundTemplateData()
  }, [id])

  useEffect(() => {
    if (activeFile) {
      setEditorContent(activeFile.content)

      if (monacoRef.current && editorRef.current) {
        setTimeout(() => {
          updateEditorLanguage()
        }, 50)
      }
    }
  }, [activeFile])

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
    }
  }, [])

  // Render loading state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-6">
        <Card className="w-full max-w-md border-red-200 dark:border-red-800 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Something went wrong</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
              </div>
              <Button
                onClick={() => {
                  setError(null)
                  fetchPlaygroundTemplateData()
                }}
                variant="destructive"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadingStep < 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-6">
        <Card className="w-full max-w-md shadow-xl border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="text-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Code2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Loading Playground</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Setting up your development environment</p>
              </div>
              
              <div className="space-y-4">
                <LoadingStep currentStep={loadingStep} step={1} label="Loading playground metadata" />
                <LoadingStep currentStep={loadingStep} step={2} label="Loading template structure" />
                <LoadingStep currentStep={loadingStep} step={3} label="Ready to explore" />
              </div>
              
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${(loadingStep / 3) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-6">
        <Card className="w-full max-w-md border-amber-200 dark:border-amber-800 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-full">
                <FolderOpen className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-amber-600 dark:text-amber-400">No template data available</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">The template appears to be empty or in an invalid format</p>
              </div>
              <Button onClick={loadTemplate} variant="outline" className="w-full">
                Reload Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <>
        {/* Sidebar and File Tree */}
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
          {/* Enhanced Header */}
          <header className="flex h-16 items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 px-4 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 shadow-sm">
            <SidebarTrigger className="-ml-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" />
            <Separator orientation="vertical" className="h-6" />

            <div className="flex flex-1 items-center justify-between">
              {/* Enhanced Project Info */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {playgroundData?.name || "Code Playground"}
                  </h1>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {openFiles.length} file{openFiles.length !== 1 ? 's' : ''} open
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      <span>Unsaved changes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Actions */}
              <div className="flex items-center gap-2">
                {/* Save Buttons */}
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSave}
                        disabled={!activeFile || !activeFile.hasUnsavedChanges}
                        className="h-8 px-3 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <Save className="h-3.5 w-3.5" />
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
                        className="h-8 px-3 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save All (Ctrl+Shift+S)</TooltipContent>
                  </Tooltip>
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* AI Suggestions */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchCodeSuggestion("completion")}
                      disabled={!activeFile || suggestionLoading}
                      className="h-8 px-3 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                    >
                      {suggestionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Get AI Suggestion (Ctrl+Space)</TooltipContent>
                </Tooltip>

                {/* AI Suggestions Toggle */}
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">AI</span>
                  <Switch
                    checked={isAISuggestionsEnabled}
                    onCheckedChange={setIsAISuggestionsEnabled}
                    size="sm"
                  />
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* View Controls */}
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={isPreviewVisible ? "default" : "outline"}
                        onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                        className="h-8 px-3"
                      >
                        {isPreviewVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isPreviewVisible ? "Hide" : "Show"} Preview</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={isTerminalVisible ? "default" : "outline"}
                        onClick={() => setIsTerminalVisible(!isTerminalVisible)}
                        className="h-8 px-3"
                      >
                        <Terminal className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isTerminalVisible ? "Hide" : "Show"} Terminal</TooltipContent>
                  </Tooltip>
                </div>

                {/* Settings Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 px-3 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setIsPreviewVisible(!isPreviewVisible)}>
                      {isPreviewVisible ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsTerminalVisible(!isTerminalVisible)}>
                      <Terminal className="h-4 w-4 mr-2" />
                      {isTerminalVisible ? "Hide" : "Show"} Terminal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closeAllFiles}>
                      <X className="h-4 w-4 mr-2" />
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-900">
            {openFiles.length > 0 ? (
              <div className="h-full flex flex-col">
                {/* Enhanced File Tabs */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                  <Tabs value={activeFileId || ""} onValueChange={setActiveFileId}>
                    <div className="flex items-center justify-between px-4 py-2">
                      <TabsList className="h-9 bg-transparent p-0 gap-1">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="relative h-8 px-3 bg-zinc-200 dark:bg-zinc-700 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm group border border-zinc-300 dark:border-zinc-600 rounded-md"
                          >
                            <div className="flex items-center gap-2 group">
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
                                <span className="text-xs font-medium">
                                  {file.filename}.{file.fileExtension}
                                </span>
                                {file.hasUnsavedChanges && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                )}
                              </span>
                              <button
                                className="ml-1 h-4 w-4 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={closeAllFiles} 
                          className="h-7 px-2 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>

                {/* Editor and Preview */}
                <div className="flex-1 bg-white dark:bg-zinc-900">
                  <ResizablePanelGroup direction="horizontal" className="h-full">
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
                            language={activeFile ? getEditorLanguage(activeFile.fileExtension || "") : "plaintext"}
                            options={defaultEditorOptions}
                            theme="vs-dark"
                          />
                        </div>

                        {isTerminalVisible && (
                          <>
                            <ResizableHandle className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600" />
                            <div className="h-64 border-t border-zinc-200 dark:border-zinc-800">
                              <TerminalAsync webcontainerUrl={serverUrl!} webContainerInstance={instance}  />
                            </div>
                          </>
                        )}
                      </div>
                    </ResizablePanel>

                    {isPreviewVisible && (
                      <>
                        <ResizableHandle className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600" />
                        <ResizablePanel defaultSize={50}>
                          <div className="h-full border-l border-zinc-200 dark:border-zinc-800">
                            <WebContainerPreview
                              templateData={templateData}
                              instance={instance}
                              writeFileSync={writeFileSync}
                              isLoading={containerLoading}
                              error={containerError}
                              serverUrl={serverUrl!}
                            />
                          </div>
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                        <FileText className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No files open</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Select a file from the sidebar to start editing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>

        {/* Enhanced Confirmation Dialog */}
        <Dialog
          open={confirmationDialog.isOpen}
          onOpenChange={(open) => setConfirmationDialog((prev) => ({ ...prev, isOpen: open }))}
        >
          <DialogContent className="border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-900 dark:text-zinc-100">{confirmationDialog.title}</DialogTitle>
              <DialogDescription className="text-zinc-600 dark:text-zinc-400">{confirmationDialog.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={confirmationDialog.onCancel}>
                Don't Save
              </Button>
              <Button onClick={confirmationDialog.onConfirm}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  )
}

export default MainPlaygroundPage
