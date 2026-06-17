"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Code, 
  FileText, 
  Import, 
  Loader2,
  Power,
  PowerOff,
  Braces,
  Variable
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface ToggleAIProps {
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
  onCodeCompletion: () => void;
  onFunctionSuggestion: () => void;
  onVariableSuggestion: () => void;
  onImportSuggestion: () => void;
  suggestionLoading: boolean;
  loadingProgress?: number;
  activeFeature?: string;
}

const ToggleAI: React.FC<ToggleAIProps> = ({
  isEnabled,
  onToggle,
  onCodeCompletion,
  onFunctionSuggestion,
  onVariableSuggestion,
  onImportSuggestion,
  suggestionLoading,
  loadingProgress = 0,
  activeFeature,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant={isEnabled ? "default" : "outline"}
          className={cn(
            "relative gap-2 h-8 px-3 text-sm font-medium transition-all duration-200",
            isEnabled 
              ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-50 border-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200" 
              : "bg-background hover:bg-accent text-foreground border-border",
            suggestionLoading && "opacity-75"
          )}
          onClick={(e) => e.preventDefault()}
        >
          {suggestionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
          <span>AI</span>
          {isEnabled ? (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          ) : (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              isEnabled 
                ? "bg-zinc-900 text-zinc-50 border-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-200" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {isEnabled ? "Active" : "Inactive"}
          </Badge>
        </DropdownMenuLabel>
        
        {suggestionLoading && activeFeature && (
          <div className="px-3 pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{activeFeature}</span>
                <span>{Math.round(loadingProgress)}%</span>
              </div>
              <Progress 
                value={loadingProgress} 
                className="h-1.5"
              />
            </div>
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onToggle(!isEnabled)}
          className="py-2.5 cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <Power className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PowerOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <div className="text-sm font-medium">
                  {isEnabled ? "Disable" : "Enable"} AI
                </div>
                <div className="text-xs text-muted-foreground">
                  Toggle AI assistance
                </div>
              </div>
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full border transition-all duration-200 relative",
              isEnabled 
                ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-50 dark:border-zinc-50" 
                : "bg-muted border-border"
            )}>
              <div className={cn(
                "w-3 h-3 rounded-full bg-background transition-all duration-200 absolute top-0.5",
                isEnabled ? "left-4" : "left-0.5"
              )} />
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          disabled={!isEnabled || suggestionLoading}
          onClick={(e) => {
            e.preventDefault();
            onCodeCompletion();
          }}
          className={cn(
            "py-2.5 cursor-pointer",
            !isEnabled || suggestionLoading 
              ? "opacity-50 cursor-not-allowed" 
              : ""
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <Code className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Code Completion</div>
              <div className="text-xs text-muted-foreground">Ctrl+Space</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          disabled={!isEnabled || suggestionLoading}
          onClick={(e) => {
            e.preventDefault();
            onFunctionSuggestion();
          }}
          className={cn(
            "py-2.5 cursor-pointer",
            !isEnabled || suggestionLoading 
              ? "opacity-50 cursor-not-allowed" 
              : ""
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <Braces className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Function Suggestion</div>
              <div className="text-xs text-muted-foreground">Generate function templates</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          disabled={!isEnabled || suggestionLoading}
          onClick={(e) => {
            e.preventDefault();
            onVariableSuggestion();
          }}
          className={cn(
            "py-2.5 cursor-pointer",
            !isEnabled || suggestionLoading 
              ? "opacity-50 cursor-not-allowed" 
              : ""
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <Variable className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Variable Suggestion</div>
              <div className="text-xs text-muted-foreground">Smart naming conventions</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          disabled={!isEnabled || suggestionLoading}
          onClick={(e) => {
            e.preventDefault();
            onImportSuggestion();
          }}
          className={cn(
            "py-2.5 cursor-pointer",
            !isEnabled || suggestionLoading 
              ? "opacity-50 cursor-not-allowed" 
              : ""
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <Import className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Import Suggestion</div>
              <div className="text-xs text-muted-foreground">Auto-import detection</div>
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ToggleAI;