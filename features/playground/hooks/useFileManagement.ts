import { useState } from "react";
import type { TemplateFile, TemplateFolder } from "../types";
import { toast } from "sonner";

export const useFileManagement = (templateData: TemplateFolder | null) => {
  const [selectedFile, setSelectedFile] = useState<TemplateFile | null>(null);

  const handleFileSelect = (file: TemplateFile) => {
    if (!file) return;
    setSelectedFile(file);
    toast.info(`Opened ${file.filename}.${file.fileExtension}`);
  };

  const handleAddFile = (newFile: TemplateFile, parentPath: string) => {
    if (!templateData) return;
    // ... file adding logic
  };

  const handleAddFolder = (newFolder: TemplateFolder, parentPath: string) => {
    if (!templateData) return;
    // ... folder adding logic
  };

  return {
    selectedFile,
    setSelectedFile,
    handleFileSelect,
    handleAddFile,
    handleAddFolder,
  };
};