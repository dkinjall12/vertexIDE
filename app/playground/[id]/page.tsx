"use client"

import { PlaygroundProvider } from "@/features/playground/context/playground-context"
import { PlaygroundLayout } from "@/features/playground/components/playground-layout"

export default function MainPlaygroundPage() {
  return (
    <PlaygroundProvider>
      <PlaygroundLayout />
    </PlaygroundProvider>
  )
}