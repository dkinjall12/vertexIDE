"use client";
import React, { useState } from 'react';
import {
  Save,
  Loader2,
  Sparkles,
  Lightbulb,
  Settings,
  Eye,
  EyeOff,
  Terminal,
  X,
  Play,
  Pause,
  RotateCcw,
  Zap,
  ZapOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlaygroundEditorHeaderProps {
  playgroundName?: string;
  openFilesCount?: number;
  hasUnsavedChanges?: boolean;
  isPreviewVisible?: boolean;
  isTerminalVisible?: boolean;
  isAISuggestionsEnabled?: boolean;
  isRunning?: boolean;
  onSave?: () => void;
  onSaveAll?: () => void;
  onTogglePreview?: () => void;
  onToggleTerminal?: () => void;
  onToggleAI?: () => void;
  onCloseAllFiles?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onGetSuggestion?: (type: string) => void;
  suggestionLoading?: boolean;
  canSave?: boolean;
  canSaveAll?: boolean;
}

export function PlaygroundEditorHeader({
  playgroundName = "Code Playground",
  openFilesCount = 0,
  hasUnsavedChanges = false,
  isPreviewVisible = true,
  isTerminalVisible = false,
  isAISuggestionsEnabled = true,
  isRunning = false,
  onSave = () => {},
  onSaveAll = () => {},
  onTogglePreview = () => {},
  onToggleTerminal = () => {},
  onToggleAI = () => {},
  onCloseAllFiles = () => {},
  onRun = () => {},
  onStop = () => {},
  onRestart = () => {},
  onGetSuggestion = () => {},
  suggestionLoading = false,
  canSave = false,
  canSaveAll = false,
}: PlaygroundEditorHeaderProps) {
  const [isAIDropdownOpen, setIsAIDropdownOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);

  const handleGetSuggestion = (type: string) => {
    onGetSuggestion(type);
    setIsAIDropdownOpen(false);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-4 sticky top-0 z-50">
      <div className="flex flex-1 items-center gap-3">
        {/* Project Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-zinc-100 truncate">
              {playgroundName}
            </h1>
            {hasUnsavedChanges && (
              <Badge 
                variant="outline" 
                className="h-5 px-1.5 text-xs bg-amber-500/10 border-amber-500/20 text-amber-400"
              >
                Unsaved
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400 truncate">
            {openFilesCount} file{openFilesCount !== 1 ? 's' : ''} open
          </p>
        </div>

        <Separator orientation="vertical" className="h-6 bg-zinc-700" />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Save Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSave}
                  disabled={!canSave}
                  className={cn(
                    "h-8 px-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-200",
                    canSave && "text-zinc-200 hover:bg-zinc-700/60"
                  )}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save (Ctrl+S)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSaveAll}
                  disabled={!canSaveAll}
                  className={cn(
                    "h-8 px-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-200",
                    canSaveAll && "text-zinc-200 hover:bg-zinc-700/60"
                  )}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="text-xs ml-1">All</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save All (Ctrl+Shift+S)</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 bg-zinc-700" />

          {/* Execution Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={isRunning ? onStop : onRun}
                  className={cn(
                    "h-8 px-2.5 transition-all duration-200",
                    isRunning 
                      ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                      : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  )}
                >
                  {isRunning ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRunning ? 'Stop' : 'Run'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRestart}
                  className="h-8 px-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restart</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 bg-zinc-700" />

          {/* AI Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleGetSuggestion("completion")}
                  disabled={suggestionLoading || !isAISuggestionsEnabled}
                  className={cn(
                    "h-8 px-2.5 transition-all duration-200",
                    isAISuggestionsEnabled 
                      ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" 
                      : "text-zinc-500 hover:text-zinc-400"
                  )}
                >
                  {suggestionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Get AI Suggestion (Ctrl+Space)</TooltipContent>
            </Tooltip>

            <DropdownMenu open={isAIDropdownOpen} onOpenChange={setIsAIDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!isAISuggestionsEnabled}
                  className={cn(
                    "h-8 px-2.5 transition-all duration-200",
                    isAISuggestionsEnabled 
                      ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10" 
                      : "text-zinc-500 hover:text-zinc-400"
                  )}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-zinc-900 border-zinc-700 shadow-xl"
              >
                <DropdownMenuItem 
                  onClick={() => handleGetSuggestion("completion")}
                  className="text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Code Completion
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleGetSuggestion("function")}
                  className="text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  Function Suggestion
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleGetSuggestion("variable")}
                  className="text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  Variable Suggestion
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleGetSuggestion("import")}
                  className="text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  Import Suggestion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-6 bg-zinc-700" />

          {/* View Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onTogglePreview}
                  className={cn(
                    "h-8 px-2.5 transition-all duration-200",
                    isPreviewVisible 
                      ? "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 bg-cyan-500/5" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                  )}
                >
                  {isPreviewVisible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPreviewVisible ? 'Hide Preview' : 'Show Preview'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onToggleTerminal}
                  className={cn(
                    "h-8 px-2.5 transition-all duration-200",
                    isTerminalVisible 
                      ? "text-green-400 hover:text-green-300 hover:bg-green-500/10 bg-green-500/5" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                  )}
                >
                  <Terminal className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isTerminalVisible ? 'Hide Terminal' : 'Show Terminal'}
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 bg-zinc-700" />

          {/* Settings & AI Toggle */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onToggleAI}
                  className={cn(
                    "h-8 px-2.5 transition-all duration-200",
                    isAISuggestionsEnabled 
                      ? "text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 bg-violet-500/5" 
                      : "text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800/60"
                  )}
                >
                  {isAISuggestionsEnabled ? (
                    <Zap className="h-3.5 w-3.5" />
                  ) : (
                    <ZapOff className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isAISuggestionsEnabled ? 'Disable AI' : 'Enable AI'}
              </TooltipContent>
            </Tooltip>

            <DropdownMenu open={isSettingsDropdownOpen} onOpenChange={setIsSettingsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-200"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-44 bg-zinc-900 border-zinc-700 shadow-xl"
              >
                <DropdownMenuItem 
                  onClick={() => {
                    onTogglePreview();
                    setIsSettingsDropdownOpen(false);
                  }}
                  className="text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  {isPreviewVisible ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {isPreviewVisible ? 'Hide' : 'Show'} Preview
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    onToggleTerminal();
                    setIsSettingsDropdownOpen(false);
                  }}
                  className="text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800"
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  {isTerminalVisible ? 'Hide' : 'Show'} Terminal
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem 
                  onClick={() => {
                    onCloseAllFiles();
                    setIsSettingsDropdownOpen(false);
                  }}
                  className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close All Files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}