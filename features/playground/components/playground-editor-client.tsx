"use client";
import React from 'react'
import { PlaygroundEditor } from './playground-editor'
import type { TemplateFile } from '@/features/playground/libs/path-to-json'

interface PlaygroundEditorClientProps {
  templateData: TemplateFile
}

const PlaygroundEditorClient: React.FC<PlaygroundEditorClientProps> = ({ templateData }) => {
  return (
    <div className="h-screen">
      <PlaygroundEditor
        activeFile={templateData}
        content={templateData?.content ?? ""}
        onContentChange={() => {}}
        suggestion={null}
        suggestionLoading={false}
        suggestionPosition={null}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onTriggerSuggestion={() => {}}
      />
    </div>
  )
}

export default PlaygroundEditorClient
