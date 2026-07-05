"use client"

import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import LoadingStep from "@/components/ui/loader"
import { PlaygroundHeader } from "./playground-header"

interface PlaygroundLayoutProps {
  error?: string | null
  loadingStep?: number
  onRetry?: () => void
  children?: React.ReactNode
}

export function PlaygroundLayout({ error, loadingStep = 3, onRetry, children }: PlaygroundLayoutProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={onRetry} variant="destructive">
          Try Again
        </Button>
      </div>
    )
  }

  if (loadingStep < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">Loading Playground</h2>
          <div className="mb-8">
            <LoadingStep currentStep={loadingStep} step={1} label="Loading playground metadata" />
            <LoadingStep currentStep={loadingStep} step={2} label="Loading template structure" />
            <LoadingStep currentStep={loadingStep} step={3} label="Ready to explore" />
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-300 ease-in-out"
              style={{ width: `${(loadingStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <PlaygroundHeader />
      {children}
    </div>
  )
}