"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { getPlaygroundById, SaveUpdatedCode } from "@/features/playground/actions"
import type { TemplateFolder } from "../libs/path-to-json"
import type { PlaygroundData } from "../types"

interface PlaygroundContextType {
  playgroundData: PlaygroundData | null
  templateData: TemplateFolder | null
  loadingStep: number
  error: string | null
  openFiles: OpenFile[]
  activeFileId: string | null
  editorContent: string
  isTerminalVisible: boolean
  isPreviewVisible: boolean
  isRunning: boolean
  suggestion: string | null
  suggestionLoading: boolean
  suggestionPosition: { line: number; column: number } | null
  suggestionType: string
  isAISuggestionsEnabled: boolean
  setPlaygroundData: (data: PlaygroundData | null) => void
  setTemplateData: (data: TemplateFolder | null) => void
  setLoadingStep: (step: number) => void
  setError: (error: string | null) => void
  setOpenFiles: (files: OpenFile[]) => void
  setActiveFileId: (id: string | null) => void
  setEditorContent: (content: string) => void
  setIsTerminalVisible: (visible: boolean) => void
  setIsPreviewVisible: (visible: boolean) => void
  setIsRunning: (running: boolean) => void
  setSuggestion: (suggestion: string | null) => void
  setSuggestionLoading: (loading: boolean) => void
  setSuggestionPosition: (position: { line: number; column: number } | null) => void
  setSuggestionType: (type: string) => void
  setIsAISuggestionsEnabled: (enabled: boolean) => void
  fetchPlaygroundData: () => Promise<void>
  handleSave: (fileId?: string) => Promise<void>
  handleSaveAll: () => Promise<void>
}

interface OpenFile {
  id: string
  filename: string
  fileExtension: string
  content: string
  originalContent: string
  hasUnsavedChanges: boolean
}

const PlaygroundContext = createContext<PlaygroundContextType | null>(null)

export function PlaygroundProvider({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null)
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null)
  const [loadingStep, setLoadingStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState("")
  const [isTerminalVisible, setIsTerminalVisible] = useState(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionPosition, setSuggestionPosition] = useState<{ line: number; column: number } | null>(null)
  const [suggestionType, setSuggestionType] = useState("completion")
  const [isAISuggestionsEnabled, setIsAISuggestionsEnabled] = useState(true)

  const fetchPlaygroundData = async () => {
    if (!id) return

    try {
      setLoadingStep(1)
      setError(null)

      const data = await getPlaygroundById(id)
      setPlaygroundData(data as PlaygroundData)

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
          }
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

  const handleSave = async (fileId?: string) => {
    const targetFileId = fileId || activeFileId
    if (!targetFileId || !templateData) return

    const fileToSave = openFiles.find((f) => f.id === targetFileId)
    if (!fileToSave) return

    try {
      const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder

      const updateFileContent = (items: any[]): any[] => {
        return items.map((item) => {
          if ("folderName" in item) {
            return {
              ...item,
              items: updateFileContent(item.items),
            }
          } else {
            if (item.filename === fileToSave.filename && item.fileExtension === fileToSave.fileExtension) {
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
      await SaveUpdatedCode(id, updatedTemplateData)

      setOpenFiles((prev) =>
        prev.map((file) =>
          file.id === targetFileId
            ? {
                ...file,
                hasUnsavedChanges: false,
                originalContent: file.content,
              }
            : file
        )
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

  useEffect(() => {
    if (id) {
      fetchPlaygroundData()
    }
  }, [id])

  const value = {
    playgroundData,
    templateData,
    loadingStep,
    error,
    openFiles,
    activeFileId,
    editorContent,
    isTerminalVisible,
    isPreviewVisible,
    isRunning,
    suggestion,
    suggestionLoading,
    suggestionPosition,
    suggestionType,
    isAISuggestionsEnabled,
    setPlaygroundData,
    setTemplateData,
    setLoadingStep,
    setError,
    setOpenFiles,
    setActiveFileId,
    setEditorContent,
    setIsTerminalVisible,
    setIsPreviewVisible,
    setIsRunning,
    setSuggestion,
    setSuggestionLoading,
    setSuggestionPosition,
    setSuggestionType,
    setIsAISuggestionsEnabled,
    fetchPlaygroundData,
    handleSave,
    handleSaveAll,
  }

  return <PlaygroundContext.Provider value={value}>{children}</PlaygroundContext.Provider>
}

export function usePlayground() {
  const context = useContext(PlaygroundContext)
  if (!context) {
    throw new Error("usePlayground must be used within a PlaygroundProvider")
  }
  return context
}