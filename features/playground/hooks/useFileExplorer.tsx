import { create } from "zustand";

import { toast } from "sonner";
import { TemplateFile, TemplateFolder } from "../types";
import { SaveUpdatedCode } from "../actions";
import { generateFileId } from "../libs";

interface FileExplorerState {
  templateData: TemplateFolder | null;
  openFiles: OpenFile[];
  activeFileId: string | null;
  editorContent: string;

  // Actions
  setTemplateData: (data: TemplateFolder | null) => void;
  setEditorContent: (content: string) => void;
  setOpenFiles: (files: OpenFile[]) => void;
  setActiveFileId: (fileId: string | null) => void;
  openFile: (file: TemplateFile) => void;
  closeFile: (fileId: string) => void;
  closeAllFiles: () => void;
  handleAddFile: (newFile: TemplateFile, parentPath: string) => void;
  handleAddFolder: (newFolder: TemplateFolder, parentPath: string) => void;
  handleDeleteFile: (
    file: TemplateFile,
    parentPath: string,
    playgroundId: string
  ) => Promise<void>;
  handleDeleteFolder: (
    folder: TemplateFolder,
    parentPath: string,
    playgroundId: string
  ) => Promise<void>;
  handleRenameFile: (
    file: TemplateFile,
    newFilename: string,
    newExtension: string,
    parentPath: string,
    playgroundId: string
  ) => Promise<void>;
  handleRenameFolder: (
    folder: TemplateFolder,
    newFolderName: string,
    parentPath: string,
    playgroundId: string
  ) => Promise<void>;
  updateFileContent: (fileId: string, content: string) => void;
}

interface OpenFile extends TemplateFile {
  id: string;
  hasUnsavedChanges: boolean;
  content: string;
  originalContent: string;
}

export const useFileExplorer = create<FileExplorerState>((set, get) => ({
  templateData: null,
  openFiles: [] satisfies OpenFile[],
  activeFileId: null,
  editorContent: "",

  setTemplateData: (data) => set({ templateData: data }),

  setEditorContent: (content) => set({ editorContent: content }),

  setOpenFiles: (files) => set({ openFiles: files }),

  setActiveFileId: (fileId) => set({ activeFileId: fileId }),
  openFile: (file) => {
    const fileId = generateFileId(file);
    const { openFiles, activeFileId } = get();
    const existingFile = openFiles.find((f) => f.id === fileId);

    if (existingFile) {
      set({ activeFileId: fileId, editorContent: existingFile.content });
      return;
    }

    const newOpenFile: OpenFile = {
      ...file,
      id: fileId,
      hasUnsavedChanges: false,
      content: file.content || "",
      originalContent: file.content || "",
    };

    set((state) => ({
      openFiles: [...state.openFiles, newOpenFile],
      activeFileId: fileId,
      editorContent: file.content || "",
    }));
  },

  closeFile: (fileId) => {
    const { openFiles } = get();
    const newFiles = openFiles.filter((f) => f.id !== fileId);
    const newActiveFile =
      newFiles.length > 0 ? newFiles[newFiles.length - 1] : null;

    set({
      openFiles: newFiles,
      activeFileId: newActiveFile?.id || null,
      editorContent: newActiveFile?.content || "",
    });
  },

  closeAllFiles: () => {
    set({
      openFiles: [],
      activeFileId: null,
      editorContent: "",
    });
  },

  handleAddFile: (newFile, parentPath) => {
    const { templateData } = get();
    if (!templateData) return;

    try {
      const updatedTemplateData = JSON.parse(
        JSON.stringify(templateData)
      ) as TemplateFolder;
      const pathParts = parentPath.split("/");
      let currentFolder = updatedTemplateData;

      for (const part of pathParts) {
        if (part) {
          const nextFolder = currentFolder.items.find(
            (item) => "folderName" in item && item.folderName === part
          ) as TemplateFolder;
          if (nextFolder) currentFolder = nextFolder;
        }
      }

      currentFolder.items.push(newFile);
      set({ templateData: updatedTemplateData });
      toast.success(
        `Created file: ${newFile.filename}.${newFile.fileExtension}`
      );
      get().openFile(newFile);
    } catch (error) {
      console.error("Error adding file:", error);
      toast.error("Failed to create file");
    }
  },

  // Add remaining methods following the same pattern...
  handleAddFolder: (newFolder, parentPath) => {
    const { templateData } = get();
    if (!templateData) return;

    try {
      const updatedTemplateData = JSON.parse(
        JSON.stringify(templateData)
      ) as TemplateFolder;
      const pathParts = parentPath.split("/");
      let currentFolder = updatedTemplateData;

      for (const part of pathParts) {
        if (part) {
          const nextFolder = currentFolder.items.find(
            (item) => "folderName" in item && item.folderName === part
          ) as TemplateFolder;
          if (nextFolder) currentFolder = nextFolder;
        }
      }

      currentFolder.items.push(newFolder);
      set({ templateData: updatedTemplateData });
      toast.success(`Created folder: ${newFolder.folderName}`);
    } catch (error) {
      console.error("Error adding folder:", error);
      toast.error("Failed to create folder");
    }
  },

  handleDeleteFile: async (file, parentPath, playgroundId) => {
    const { templateData, openFiles, activeFileId } = get();
    if (!templateData) return;

    try {
      const updatedTemplateData = JSON.parse(
        JSON.stringify(templateData)
      ) as TemplateFolder;
      const pathParts = parentPath.split("/");
      let currentFolder = updatedTemplateData;

      for (const part of pathParts) {
        if (part) {
          const nextFolder = currentFolder.items.find(
            (item) => "folderName" in item && item.folderName === part
          ) as TemplateFolder;
          if (nextFolder) currentFolder = nextFolder;
        }
      }

      currentFolder.items = currentFolder.items.filter(
        (item) =>
          !("filename" in item) ||
          item.filename !== file.filename ||
          item.fileExtension !== file.fileExtension
      );

      // Close file if open
      const fileId = `${file.filename}.${file.fileExtension}`;
      if (openFiles.some((f) => f.id === fileId)) {
        get().closeFile(fileId);
      }

      set({ templateData: updatedTemplateData });

      // Save to backend
      await SaveUpdatedCode(playgroundId, updatedTemplateData);
      toast.success(`Deleted file: ${file.filename}.${file.fileExtension}`);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  },

  handleDeleteFolder: async (folder, parentPath, playgroundId) => {
    const { templateData } = get();
    if (!templateData) return;

    try {
      const updatedTemplateData = JSON.parse(
        JSON.stringify(templateData)
      ) as TemplateFolder;
      const pathParts = parentPath.split("/");
      let currentFolder = updatedTemplateData;

      for (const part of pathParts) {
        if (part) {
          const nextFolder = currentFolder.items.find(
            (item) => "folderName" in item && item.folderName === part
          ) as TemplateFolder;
          if (nextFolder) currentFolder = nextFolder;
        }
      }

      currentFolder.items = currentFolder.items.filter(
        (item) =>
          !("folderName" in item) || item.folderName !== folder.folderName
      );

      // Close all files in the deleted folder recursively
      const closeFilesInFolder = (folder: TemplateFolder) => {
        folder.items.forEach((item) => {
          if ("filename" in item) {
            const fileId = `${item.filename}.${item.fileExtension}`;
            get().closeFile(fileId);
          } else if ("folderName" in item) {
            closeFilesInFolder(item);
          }
        });
      };
      closeFilesInFolder(folder);

      set({ templateData: updatedTemplateData });

      // Save to backend
      await SaveUpdatedCode(playgroundId, updatedTemplateData);
      toast.success(`Deleted folder: ${folder.folderName}`);
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder");
    }
  },

  handleRenameFile: async (
    file,
    newFilename,
    newExtension,
    parentPath,
    playgroundId
  ) => {
    const { templateData, openFiles, activeFileId } = get();
    if (!templateData) return;

    const oldFileId = `${file.filename}.${file.fileExtension}`;
    const newFileId = `${newFilename}.${newExtension}`;

    try {
      const updatedTemplateData = JSON.parse(
        JSON.stringify(templateData)
      ) as TemplateFolder;
      const pathParts = parentPath.split("/");
      let currentFolder = updatedTemplateData;

      for (const part of pathParts) {
        if (part) {
          const nextFolder = currentFolder.items.find(
            (item) => "folderName" in item && item.folderName === part
          ) as TemplateFolder;
          if (nextFolder) currentFolder = nextFolder;
        }
      }

      const fileIndex = currentFolder.items.findIndex(
        (item) =>
          "filename" in item &&
          item.filename === file.filename &&
          item.fileExtension === file.fileExtension
      );

      if (fileIndex !== -1) {
        const updatedFile = {
          ...currentFolder.items[fileIndex],
          filename: newFilename,
          fileExtension: newExtension,
        } as TemplateFile;
        currentFolder.items[fileIndex] = updatedFile;

        // Update open files
        const updatedOpenFiles = openFiles.map((f) =>
          f.id === oldFileId
            ? {
                ...f,
                id: newFileId,
                filename: newFilename,
                fileExtension: newExtension,
              }
            : f
        );

        set({
          templateData: updatedTemplateData,
          openFiles: updatedOpenFiles,
          activeFileId: activeFileId === oldFileId ? newFileId : activeFileId,
        });

        // Save to backend
        await SaveUpdatedCode(playgroundId, updatedTemplateData);
        toast.success(`Renamed file to: ${newFilename}.${newExtension}`);
      }
    } catch (error) {
      console.error("Error renaming file:", error);
      toast.error("Failed to rename file");
    }
  },
  handleRenameFolder: async (
    folder,
    newFolderName,
    parentPath,
    playgroundId
  ) => {
    const { templateData } = get();
    if (!templateData) return;

    try {
      const updatedTemplateData = JSON.parse(
        JSON.stringify(templateData)
      ) as TemplateFolder;
      const pathParts = parentPath.split("/");
      let currentFolder = updatedTemplateData;

      for (const part of pathParts) {
        if (part) {
          const nextFolder = currentFolder.items.find(
            (item) => "folderName" in item && item.folderName === part
          ) as TemplateFolder;
          if (nextFolder) currentFolder = nextFolder;
        }
      }

      const folderIndex = currentFolder.items.findIndex(
        (item) => "folderName" in item && item.folderName === folder.folderName
      );

      if (folderIndex !== -1) {
        const updatedFolder = {
          ...currentFolder.items[folderIndex],
          folderName: newFolderName,
        } as TemplateFolder;
        currentFolder.items[folderIndex] = updatedFolder;

        set({ templateData: updatedTemplateData });

        // Save to backend
        await SaveUpdatedCode(playgroundId, updatedTemplateData);
        toast.success(`Renamed folder to: ${newFolderName}`);
      }
    } catch (error) {
      console.error("Error renaming folder:", error);
      toast.error("Failed to rename folder");
    }
  },
  updateFileContent: (fileId, content) => {
    set((state) => ({
      openFiles: state.openFiles.map((file) =>
        file.id === fileId
          ? {
              ...file,
              content,
              hasUnsavedChanges: content !== file.originalContent,
            }
          : file
      ),
      editorContent:
        fileId === state.activeFileId ? content : state.editorContent,
    }));
  },
}));
