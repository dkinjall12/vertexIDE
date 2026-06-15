"use client";

import React, { useEffect, useState, useRef } from "react";
import { useWebContainer } from "../hooks/useWebContainer";
import type { TemplateFolder } from "@/features/playground/libs/path-to-json";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import TerminalComponent from "./terminal";
import { WebContainer } from "@webcontainer/api";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  templateData,
  error,
  instance,
  isLoading,
  serverUrl,
  writeFileSync,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4; // transforming, mounting, installing, starting
  const terminalRef = useRef<any>(null); // Reference to the terminal instance

  const addLogToTerminal = (message: string) => {
    if (terminalRef.current) {
      terminalRef.current.writeln(message);
    }
  };

  useEffect(() => {
    async function setupContainer() {
      if (!instance) return;

      try {
        // Step 1: Transform data
        setLoadingState((prev) => ({ ...prev, transforming: true }));
        setCurrentStep(1);
        addLogToTerminal("Transforming template data...");

        // @ts-ignore
        const files = transformToWebContainerFormat(templateData);

        setLoadingState((prev) => ({ ...prev, transforming: false, mounting: true }));
        setCurrentStep(2);
        addLogToTerminal("Mounting files to container...");

        // Step 2: Mount files
        await instance.mount(files);

        setLoadingState((prev) => ({ ...prev, mounting: false, installing: true }));
        setCurrentStep(3);
        addLogToTerminal("Installing dependencies...");

        // Step 3: Install dependencies
        const installProcess = await instance.spawn("npm", ["install"]);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              addLogToTerminal(data.toString());
            },
          })
        );

        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          throw new Error("Failed to install dependencies");
        }

        setLoadingState((prev) => ({ ...prev, installing: false, starting: true }));
        setCurrentStep(4);
        addLogToTerminal("Starting development server...");

        // Step 4: Start the server
        const startProcess = await instance.spawn("npm", ["run", "start"]);

        startProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              addLogToTerminal(data.toString());
            },
          })
        );

        // Listen for server ready event
        instance.on("server-ready", (port: number, url: string) => {
          addLogToTerminal(`Server ready on port ${port} at ${url}`);
          setPreviewUrl(url);
          setLoadingState((prev) => ({
            ...prev,
            starting: false,
            ready: true,
          }));
        });
      } catch (err) {
        console.error("Error setting up container:", err);
        addLogToTerminal(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    setupContainer();
  }, [instance, templateData]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Setting up the environment for your project...</p>
        </div>
      </div>
    );
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
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm mx-auto">
            <h3 className="text-lg font-medium mb-4">Setting up your environment</h3>

            <Progress value={(currentStep / totalSteps) * 100} className="h-2 mb-6" />

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Transforming template data</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Mounting files</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Installing dependencies</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Starting development server</span>
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1">
            <TerminalComponent webContainerInstance={instance} />
          </div>
        </div>
      ) : (
        <iframe src={previewUrl} className="w-full h-full border-none" title="WebContainer Preview" />
      )}
    </div>
  );
};

export default WebContainerPreview;
