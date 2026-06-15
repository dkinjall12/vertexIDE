"use client"

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import "xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  webcontainerUrl?: string;
  className?: string;
  theme?: "dark" | "light";
  // Add WebContainer instance for direct communication
  webContainerInstance?: any;
}

const TerminalComponent: React.FC<TerminalProps> = ({ 
  webcontainerUrl, 
  className,
  theme = "dark",
  webContainerInstance
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const processRef = useRef<any>(null);

  const terminalThemes = {
    dark: {
      background: "#09090B",
      foreground: "#FAFAFA",
      cursor: "#FAFAFA",
      cursorAccent: "#09090B",
      selection: "#27272A",
      black: "#18181B",
      red: "#EF4444",
      green: "#22C55E",
      yellow: "#EAB308",
      blue: "#3B82F6",
      magenta: "#A855F7",
      cyan: "#06B6D4",
      white: "#F4F4F5",
      brightBlack: "#3F3F46",
      brightRed: "#F87171",
      brightGreen: "#4ADE80",
      brightYellow: "#FDE047",
      brightBlue: "#60A5FA",
      brightMagenta: "#C084FC",
      brightCyan: "#22D3EE",
      brightWhite: "#FFFFFF",
    },
    light: {
      background: "#FFFFFF",
      foreground: "#18181B",
      cursor: "#18181B",
      cursorAccent: "#FFFFFF",
      selection: "#E4E4E7",
      black: "#18181B",
      red: "#DC2626",
      green: "#16A34A",
      yellow: "#CA8A04",
      blue: "#2563EB",
      magenta: "#9333EA",
      cyan: "#0891B2",
      white: "#F4F4F5",
      brightBlack: "#71717A",
      brightRed: "#EF4444",
      brightGreen: "#22C55E",
      brightYellow: "#EAB308",
      brightBlue: "#3B82F6",
      brightMagenta: "#A855F7",
      brightCyan: "#06B6D4",
      brightWhite: "#FAFAFA",
    },
  };

  const initializeTerminal = () => {
    if (!terminalRef.current || term.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: terminalThemes[theme],
      allowTransparency: false,
      convertEol: true,
      scrollback: 1000,
      tabStopWidth: 4,
    });

    // Add addons
    const fitAddonInstance = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddonInstance = new SearchAddon();

    terminal.loadAddon(fitAddonInstance);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddonInstance);

    terminal.open(terminalRef.current);
    
    fitAddon.current = fitAddonInstance;
    searchAddon.current = searchAddonInstance;
    term.current = terminal;

    // Initial fit
    setTimeout(() => {
      fitAddonInstance.fit();
    }, 100);

    // Welcome message
    terminal.writeln("🚀 WebContainer Terminal Ready");
    terminal.writeln("Connected to your development environment");
    terminal.write("$ ");

    return terminal;
  };

  // Connect to WebContainer instance directly for better sync
  const connectToWebContainer = async (terminal: Terminal) => {
    if (!webContainerInstance) {
      terminal.writeln("⚠️  WebContainer instance not available");
      return;
    }

    try {
      setIsConnected(true);
      terminal.clear();
      terminal.writeln("✅ Connected to WebContainer");
      terminal.writeln("Type commands to interact with your environment");
      terminal.write("$ ");

      // Handle terminal input and execute commands directly in WebContainer
      terminal.onData(async (data) => {
        // Handle special keys
        if (data === '\r') { // Enter key
          const currentLine = getCurrentCommandLine();
          if (currentLine.trim()) {
            terminal.writeln('');
            await executeCommand(terminal, currentLine.trim());
          } else {
            terminal.writeln('');
            terminal.write("$ ");
          }
        } else if (data === '\u007F') { // Backspace
          terminal.write('\b \b');
        } else if (data === '\u0003') { // Ctrl+C
          if (processRef.current) {
            processRef.current.kill();
            processRef.current = null;
          }
          terminal.writeln('^C');
          terminal.write("$ ");
        } else {
          terminal.write(data);
        }
      });

    } catch (error) {
      setIsConnected(false);
      terminal.writeln("❌ Failed to connect to WebContainer");
      console.error("WebContainer connection error:", error);
    }
  };

  // Execute command in WebContainer and stream output
  const executeCommand = async (terminal: Terminal, command: string) => {
    if (!webContainerInstance) {
      terminal.writeln("❌ WebContainer not available");
      terminal.write("$ ");
      return;
    }

    try {
      // Parse command and arguments
      const parts = command.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      // Start the process
      const process = await webContainerInstance.spawn(cmd, args);
      processRef.current = process;

      // Stream stdout
      process.output.pipeTo(new WritableStream({
        write(data) {
          terminal.write(data);
        }
      }));

      // Wait for process to complete
      const exitCode = await process.exit;
      
      // Clear process reference
      processRef.current = null;
      
      // Show prompt again
      terminal.writeln('');
      terminal.write("$ ");

    } catch (error) {
      terminal.writeln(`❌ Command failed: ${error}`);
      terminal.write("$ ");
      processRef.current = null;
    }
  };

  // Get current command line (simple implementation)
  const getCurrentCommandLine = () => {
    // This is a simplified version - in a real implementation,
    // you'd track the current input more carefully
    return '';
  };

  const clearTerminal = () => {
    if (term.current) {
      term.current.clear();
      term.current.writeln("🚀 WebContainer Terminal Ready");
      term.current.write("$ ");
    }
  };

  const copyTerminalContent = async () => {
    if (term.current) {
      const content = term.current.getSelection();
      if (content) {
        try {
          await navigator.clipboard.writeText(content);
        } catch (error) {
          console.error("Failed to copy to clipboard:", error);
        }
      }
    }
  };

  const downloadTerminalLog = () => {
    if (term.current) {
      const buffer = term.current.buffer.active;
      let content = "";
      
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString(true) + "\n";
        }
      }

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `terminal-log-${new Date().toISOString().slice(0, 19)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const searchInTerminal = (term: string) => {
    if (searchAddon.current && term) {
      searchAddon.current.findNext(term);
    }
  };

  useEffect(() => {
    const terminal = initializeTerminal();
    if (terminal && webContainerInstance) {
      connectToWebContainer(terminal);
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        setTimeout(() => {
          fitAddon.current?.fit();
        }, 100);
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (processRef.current) {
        processRef.current.kill();
      }
      if (term.current) {
        term.current.dispose();
        term.current = null;
      }
    };
  }, [webContainerInstance, theme]);

  return (
    <div className={cn("flex flex-col h-full bg-background border rounded-lg overflow-hidden", className)}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-medium">WebContainer Terminal</span>
          {isConnected && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Connected</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showSearch && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchInTerminal(e.target.value);
                }}
                className="h-6 w-32 text-xs"
              />
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-6 w-6 p-0"
          >
            <Search className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={copyTerminalContent}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadTerminalLog}
            className="h-6 w-6 p-0"
          >
            <Download className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            className="h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative">
        <div 
          ref={terminalRef} 
          className="absolute inset-0 p-2"
          style={{ 
            background: terminalThemes[theme].background,
          }}
        />
      </div>
    </div>
  );
};

export default TerminalComponent;