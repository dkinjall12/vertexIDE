"use client"

import { useState, useEffect } from "react"
import { FileTree } from "@/features/playground/components/file-tree"
import { MonacoEditor } from "@/features/playground/components/code-editor"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"

interface FileItem {
  filename: string
  fileextension?: string
  content: string
  type: "file"
}

interface FolderItem {
  foldername: string
  items: (FileItem | FolderItem)[]
  type: "folder"
}

export type FileSystemItem = FileItem | FolderItem

interface PlaygroundEditorProps {
  templateData: FileSystemItem
  onSave?: (file: FileItem, content: string) => Promise<void>
}

export function PlaygroundEditor({ templateData, onSave }: PlaygroundEditorProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  // Select first file by default
  useEffect(() => {
    if (templateData && !selectedFile) {
      const firstFile = findFirstFile(templateData)
      if (firstFile) {
        setSelectedFile(firstFile)
        setFileContent(firstFile.content)
      }
    }
  }, [templateData])

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file)
    setFileContent(file.content)
  }

  const handleContentChange = (newContent: string) => {
    setFileContent(newContent)
  }

  const handleSave = async () => {
    if (selectedFile && onSave) {
      setIsSaving(true)
      try {
        await onSave(selectedFile, fileContent)
      } catch (error) {
        console.error("Error saving file:", error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col">
        <header className="h-14 border-b flex items-center px-4 justify-between">
          <div className="flex items-center">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-lg font-semibold">Code Editor</h1>
          </div>
          {selectedFile && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedFile.fileextension
                  ? `${selectedFile.filename}.${selectedFile.fileextension}`
                  : selectedFile.filename}
              </span>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            <Sidebar>
              <SidebarHeader className="border-b p-4">
                <h2 className="text-sm font-semibold">Files</h2>
              </SidebarHeader>
              <SidebarContent>
                {templateData && (
                  <FileTree
                    data={templateData}
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile || undefined}
                  />
                )}
              </SidebarContent>
            </Sidebar>

            <ResizablePanel defaultSize={75}>
              <div className="h-full w-full p-4">
                {selectedFile ? (
                  <MonacoEditor
                    content={fileContent}
                    language={selectedFile.fileextension || ""}
                    onChange={handleContentChange}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    Select a file to edit
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </SidebarProvider>
  )
}

// Helper function to find the first file in the file system
function findFirstFile(item: FileSystemItem): FileItem | null {
  if (item.type === "file") {
    return item
  }

  if (item.type === "folder" && item.items.length > 0) {
    for (const child of item.items) {
      const file = findFirstFile(child)
      if (file) return file
    }
  }

  return null
}
