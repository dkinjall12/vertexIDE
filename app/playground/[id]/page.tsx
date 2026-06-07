"use client";

import React, { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TemplateFileTree } from "@/features/playground/components/playground-explorer";
import { TemplateFile } from "@/features/playground/libs/path-to-json";
import { useParams } from "next/navigation";
import { getPlaygroundById } from "@/features/playground/actions";
import { toast } from "sonner";
import { Loader2, FileText, FolderOpen, AlertCircle } from "lucide-react";
import ReactData from "@/output/REACT.json";

// Interfaces for type safety
interface PlaygroundData {
  id: string;
  name?: string;
  // Add other relevant playground metadata fields
  [key: string]: any;
}

interface TemplateFolder {
  folderName: string;
  items: (TemplateFile | TemplateFolder)[];
}

interface LoadingStepProps {
  currentStep: number;
  step: number;
  label: string;
}

/**
 * Component to render a loading step indicator
 */
const LoadingStep: React.FC<LoadingStepProps> = ({ currentStep, step, label }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className={`rounded-full p-1 ${currentStep === step ? "bg-blue-100" : currentStep > step ? "bg-green-100" : "bg-gray-100"}`}>
      {currentStep > step ? (
        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : currentStep === step ? (
        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      ) : (
        <div className="h-4 w-4 rounded-full bg-gray-300" />
      )}
    </div>
    <span className={`text-sm ${currentStep === step ? "text-blue-600 font-medium" : currentStep > step ? "text-green-600" : "text-gray-500"}`}>
      {label}
    </span>
  </div>
);

/**
 * Main playground page component
 */
const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedFile, setSelectedFile] = useState<TemplateFile | null>(null);
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null);
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Fetch playground metadata
   */
  const fetchPlaygroundTemplateData = async () => {
    if (!id) return;
    
    try {
      setLoadingStep(1);
      setError(null);
      const data = await getPlaygroundById(id);
      setPlaygroundData(data!);
      setLoadingStep(2);
      toast.success("Playground metadata loaded");
    } catch (error) {
      console.error("Error loading playground:", error);
      setError("Failed to load playground data");
      toast.error("Failed to load playground data");
    }
  };

  /**
   * Load template data from API
   */
  const loadTemplate = async () => {
    if (!id) return;
    
    try {
      setLoadingStep(2);
      const res = await fetch(`/api/template/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load template: ${res.status}`);
      }
      const data = await res.json();
      
      // The template data needs to be a single root item for TemplateFileTree
      // Format data correctly based on the expected structure
      if (data.templateJson && Array.isArray(data.templateJson)) {
        // If it's an array, wrap it in a root folder
        setTemplateData({
          folderName: "Root",
          items: data.templateJson
        });
      } else {
        // Otherwise use as-is
        setTemplateData(data.templateJson || {
          folderName: "Root",
          items: []
        });
      }
      
      setLoadingStep(3); // Loading complete
      toast.success("Template loaded successfully");
    } catch (error) {
      console.error("Error loading template:", error);
      setError("Failed to load template data");
      toast.error("Failed to load template data");
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (id) {
      fetchPlaygroundTemplateData();
    }
  }, [id]);

  // Load template once playground data is available
  useEffect(() => {
    if (playgroundData && id) {
      loadTemplate();
    }
  }, [playgroundData, id]);

  /**
   * Handle file selection
   */
  const handleFileSelect = (file: TemplateFile) => {
    if (!file) return;
    setSelectedFile(file);
    toast.info(`Opened ${file.filename}.${file.fileExtension}`);
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            fetchPlaygroundTemplateData();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading state
  if (loadingStep < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">Loading Playground</h2>
          
          <div className="mb-8">
            <LoadingStep currentStep={loadingStep} step={1} label="Loading playground metadata" />
            <LoadingStep currentStep={loadingStep} step={2} label="Loading template structure" />
            <LoadingStep currentStep={loadingStep} step={3} label="Ready to explore" />
          </div>
          
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300 ease-in-out"
              style={{ width: `${(loadingStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Template data is empty or invalid
  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <FolderOpen className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-amber-600 mb-2">No template data available</h2>
        <p className="text-gray-600 mb-4">The template appears to be empty or in an invalid format</p>
        <button 
          onClick={loadTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Reload Template
        </button>
      </div>
    );
  }

  // Debugging console logs removed in production
  // console.log(typeof templateData)
  // console.log(typeof ReactData)

  // Main playground view
  return (
    <>
      <TemplateFileTree
        data={templateData}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile || undefined}
        title="Template Explorer"
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-col">
            <h1 className="text-sm font-medium">
              {selectedFile
                ? `${selectedFile.filename}.${selectedFile.fileExtension}`
                : "Select a file"}
            </h1>
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                {selectedFile.content ? selectedFile.content.length : 0} characters
              </p>
            )}
          </div>
        </header>
        <div className="p-4">
          {selectedFile ? (
            <pre className="rounded-md bg-muted p-4 overflow-auto max-h-[calc(100vh-8rem)]">
              <code>{selectedFile.content || "No content available"}</code>
            </pre>
          ) : (
            <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center text-muted-foreground gap-4">
              <FileText className="h-16 w-16 text-gray-300" />
              <div className="text-center">
                <p className="text-lg font-medium">No file selected</p>
                <p className="text-sm text-gray-500">Select a file from the sidebar to view its content</p>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </>
  );
};

export default MainPlaygroundPage;