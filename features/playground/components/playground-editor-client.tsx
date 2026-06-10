"use client";
import React from 'react'
import { PlaygroundEditor } from './playground-editor'
import type { FileSystemItem } from './playground-editor'

interface PlaygroundEditorClientProps {
  templateData: FileSystemItem
}

const PlaygroundEditorClient: React.FC<PlaygroundEditorClientProps> = ({ templateData }) => {
  const handleSave = async (file: FileSystemItem, content: string) => {
    // TODO: Implement save functionality
    console.log('Saving file:', file, 'with content:', content)
  }

  return (
    <div className="h-screen">
      <PlaygroundEditor 
        templateData={templateData} 
        onSave={handleSave}
      />
    </div>
  )
}

export default PlaygroundEditorClient