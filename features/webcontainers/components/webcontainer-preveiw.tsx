"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useWebContainer } from "../hooks/useWebContainer"
import type { TemplateFolder } from "@/features/playground/libs/path-to-json"
import { transformToWebContainerFormat } from "../hooks/transformer"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface WebContainerPreviewProps {
  templateData: TemplateFolder
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({ templateData }) => {
  const { serverUrl, isLoading, error, instance } = useWebContainer({ templateData })
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  })

  const [logs, setLogs] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const totalSteps = 4 // transforming, mounting, installing, starting

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
  }

  useEffect(() => {
    async function setupContainer() {
      if (!instance) return

      try {
        // Step 1: Transform data
        setLoadingState((prev) => ({ ...prev, transforming: true }))
        setCurrentStep(1)
        addLog("Transforming template data...")

        // @ts-ignore
        const files = transformToWebContainerFormat(templateData)

        setLoadingState((prev) => ({ ...prev, transforming: false, mounting: true }))
        setCurrentStep(2)
        addLog("Mounting files to container...")

        // Step 2: Mount files
        await instance.mount(files)

        setLoadingState((prev) => ({ ...prev, mounting: false, installing: true }))
        setCurrentStep(3)
        addLog("Installing dependencies...")

        // Step 3: Install dependencies
        const installProcess = await instance.spawn("npm", ["install"])

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("Install output:", data)
              addLog(data.toString())
            },
          }),
        )

        const installExitCode = await installProcess.exit

        if (installExitCode !== 0) {
          throw new Error("Failed to install dependencies")
        }

        setLoadingState((prev) => ({ ...prev, installing: false, starting: true }))
        setCurrentStep(4)
        addLog("Starting development server...")

        // Step 4: Start the server
        const startProcess = await instance.spawn("npm", ["run", "start"])

        startProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("Server output:", data)
              addLog(data)
            },
          }),
        )

        // Listen for server ready event
        instance.on("server-ready", (port: number, url: string) => {
          console.log("Server ready on port", port, "at", url)
          setPreviewUrl(url)
          setLoadingState((prev) => ({
            ...prev,
            starting: false,
            ready: true,
          }))
        })
      } catch (err) {
        console.error("Error setting up container:", err)
        addLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    setupContainer()
  }, [instance, templateData])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Setting up the environment for your project...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error}</p>
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono overflow-auto max-h-40">
            {logs.slice(-10).map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderLoadingStep = (label: string, isActive: boolean, isCompleted: boolean, stepNumber: number) => {
    return (
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center h-8 w-8 rounded-full ${
            isCompleted
              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              : isActive
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="h-5 w-5" />
          ) : isActive ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>
        <span
          className={`text-sm font-medium ${
            isActive
              ? "text-gray-900 dark:text-gray-100"
              : isCompleted
                ? "text-green-600 dark:text-green-400"
                : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex items-center justify-center">
          <div className="w-full max-w-md p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Setting up your environment</h3>

            <Progress value={(currentStep / totalSteps) * 100} className="h-2 mb-6" />

            <div className="space-y-4 mb-6">
              {renderLoadingStep("Transforming template data", loadingState.transforming, currentStep > 1, 1)}
              {renderLoadingStep("Mounting files", loadingState.mounting, currentStep > 2, 2)}
              {renderLoadingStep("Installing dependencies", loadingState.installing, currentStep > 3, 3)}
              {renderLoadingStep("Starting development server", loadingState.starting, loadingState.ready, 4)}
            </div>

            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs font-mono h-32 overflow-auto">
              {logs.slice(-15).map((log, i) => (
                <div key={i} className="mb-1 break-words">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <iframe src={previewUrl} className="w-full h-full border-none" title="WebContainer Preview" />
      )}
    </div>
  )
}

export default WebContainerPreview
