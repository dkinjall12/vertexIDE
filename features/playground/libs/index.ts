import { TemplateFile, TemplateFolder } from "./path-to-json";

export function findFilePath(
  file: TemplateFile,
  folder: TemplateFolder,
  pathSoFar: string[] = []
): string | null {
  for (const item of folder.items) {
    if ("folderName" in item) {
      const res = findFilePath(file, item, [...pathSoFar, item.folderName]);
      if (res) return res;
    } else {
      if (
        item.filename === file.filename &&
        item.fileExtension === file.fileExtension
      ) {
        return [
          ...pathSoFar,
          item.filename + (item.fileExtension ? "." + item.fileExtension : ""),
        ].join("/");
      }
    }
  }
  return null;
}


export async function longPoll<T>(
  url: string,
  options: RequestInit,
  checkCondition: (response: T) => boolean,
  interval: number = 1000, // Poll every 1 second
  timeout: number = 10000 // Timeout after 10 seconds
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: T = await response.json();

      // Check if the condition is met
      if (checkCondition(data)) {
        return data;
      }

      // Check if the timeout has been reached
      if (Date.now() - startTime >= timeout) {
        throw new Error("Long polling timed out");
      }

      // Wait for the specified interval before the next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error("Error during long polling:", error);
      throw error;
    }
  }
}

  // Helper function to generate unique file ID
 export const generateFileId =(file: TemplateFile): string => {
    return `${file.filename}.${file.fileExtension}`
  }
