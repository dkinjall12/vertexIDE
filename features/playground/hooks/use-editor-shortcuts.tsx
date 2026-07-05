"use client"

import { useEffect } from "react"

interface EditorShortcuts {
  onSave?: () => void
  onSaveAll?: () => void
  onNewFile?: () => void
  onCloseFile?: () => void
  onFind?: () => void
  onReplace?: () => void
  onToggleTerminal?: () => void
  onTogglePreview?: () => void
  onFormatDocument?: () => void
  onGoToLine?: () => void
  onDuplicate?: () => void
  onComment?: () => void
}

export function useEditorShortcuts(shortcuts: EditorShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, shiftKey, altKey, key } = event
      const isModifier = ctrlKey || metaKey

      if (!isModifier) return

      switch (key.toLowerCase()) {
        case "s":
          event.preventDefault()
          if (shiftKey) {
            shortcuts.onSaveAll?.()
          } else {
            shortcuts.onSave?.()
          }
          break

        case "n":
          if (!shiftKey && !altKey) {
            event.preventDefault()
            shortcuts.onNewFile?.()
          }
          break

        case "w":
          event.preventDefault()
          shortcuts.onCloseFile?.()
          break

        case "f":
          if (!shiftKey) {
            event.preventDefault()
            shortcuts.onFind?.()
          } else {
            event.preventDefault()
            shortcuts.onReplace?.()
          }
          break

        case "`":
          event.preventDefault()
          shortcuts.onToggleTerminal?.()
          break

        case "p":
          if (shiftKey) {
            event.preventDefault()
            shortcuts.onTogglePreview?.()
          }
          break

        case "i":
          if (shiftKey && altKey) {
            event.preventDefault()
            shortcuts.onFormatDocument?.()
          }
          break

        case "g":
          if (!shiftKey && !altKey) {
            event.preventDefault()
            shortcuts.onGoToLine?.()
          }
          break

        case "d":
          if (shiftKey) {
            event.preventDefault()
            shortcuts.onDuplicate?.()
          }
          break

        case "/":
          if (!shiftKey && !altKey) {
            event.preventDefault()
            shortcuts.onComment?.()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}
