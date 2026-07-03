"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, Loader2 } from "lucide-react";
import { useState } from "react";

type GithubImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { url: string; title?: string }) => Promise<void> | void;
  isImporting?: boolean;
};

const GithubImportModal = ({
  isOpen,
  onClose,
  onSubmit,
  isImporting = false,
}: GithubImportModalProps) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = async () => {
    if (!url.trim() || isImporting) return;
    await onSubmit({ url: url.trim(), title: title.trim() || undefined });
  };

  const reset = () => {
    setUrl("");
    setTitle("");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isImporting) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#e93f3f] flex items-center gap-2">
            <Github size={24} className="text-[#e93f3f]" />
            Import a GitHub Repository
          </DialogTitle>
          <DialogDescription>
            Paste a link to a public GitHub repository to open it in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="repo-url">Repository URL</Label>
            <Input
              id="repo-url"
              placeholder="https://github.com/owner/repo"
              value={url}
              disabled={isImporting}
              autoFocus
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="repo-title">Project name (optional)</Label>
            <Input
              id="repo-title"
              placeholder="Defaults to the repository name"
              value={title}
              disabled={isImporting}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Only public repositories are supported. Large files, binaries and
            <code className="mx-1">node_modules</code> are skipped.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            className="bg-[#E93F3F] hover:bg-[#d03636]"
            disabled={!url.trim() || isImporting}
            onClick={handleSubmit}
          >
            {isImporting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              "Import Repository"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GithubImportModal;
