import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface TerminalProps {
  webcontainerUrl: string | undefined;
}

const TerminalComponent: React.FC<TerminalProps> = ({ webcontainerUrl }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "monospace",
      fontSize: 14,
      theme: {
        background: "#0D1117",
        foreground: "#E6EDF3",
      },
    });
    const fitAddonInstance = new FitAddon();
    terminal.loadAddon(fitAddonInstance);

    terminal.open(terminalRef.current);
    fitAddon.current = fitAddonInstance;
    term.current = terminal;

    // Connect to WebContainer WebSocket terminal
    if (webcontainerUrl) {
      const socket = new WebSocket(webcontainerUrl.replace("http", "ws"));

      socket.addEventListener("open", () => {
        terminal.write("Connected to WebContainer\n");
        socket.send(JSON.stringify({ type: "command", data: "sh" }));
      });

      socket.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "stdout" || msg.type === "stderr") {
          terminal.write(msg.data);
        }
      });

      terminal.onData((data) => {
        socket.send(JSON.stringify({ type: "stdin", data }));
      });

      return () => {
        socket.close();
        terminal.dispose();
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      fitAddonInstance.fit();
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [webcontainerUrl]);

  return <div ref={terminalRef} style={{ height: "100%", width: "100%" }} />;
};

export default TerminalComponent;