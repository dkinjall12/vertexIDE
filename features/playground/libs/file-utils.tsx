import {
  File,
  FileJson,
  FileCode,
  FileText,
  FileImage,
  Package,
} from "lucide-react";
import type React from "react";

export function getFileLanguage(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase() || "";

  switch (extension) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "md":
      return "markdown";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return "plaintext";
  }
}

export function getFileIcon(filePath: string): React.ReactNode {
  const fileName = filePath.split("/").pop() || "";
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  const iconProps = { className: "h-4 w-4 mr-2" };

  // Special files
  if (fileName === "package.json") {
    return (
      <Package
        {...iconProps}
        className={`${iconProps.className} text-orange-500`}
      />
    );
  }

  // By extension
  switch (extension) {
    case "json":
      return (
        <FileJson
          {...iconProps}
          className={`${iconProps.className} text-yellow-500`}
        />
      );
    case "js":
    case "jsx":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-yellow-500`}
        />
      );
    case "ts":
    case "tsx":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-blue-500`}
        />
      );
    case "css":
    case "scss":
    case "sass":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-purple-500`}
        />
      );
    case "html":
      return (
        <FileCode
          {...iconProps}
          className={`${iconProps.className} text-orange-500`}
        />
      );
    case "md":
      return (
        <FileText
          {...iconProps}
          className={`${iconProps.className} text-gray-500`}
        />
      );
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return (
        <FileImage
          {...iconProps}
          className={`${iconProps.className} text-green-500`}
        />
      );
    default:
      return (
        <File
          {...iconProps}
          className={`${iconProps.className} text-gray-500`}
        />
      );
  }
}
