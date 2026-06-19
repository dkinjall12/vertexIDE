"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Send, Bot, User, Copy, Check, X, Download, Eye, EyeOff, MoreHorizontal, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'
import Image from "next/image"

interface AIChatSidePanelProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  id?: string
  timestamp?: Date
}

interface CodeBlockProps {
  children: string
  className?: string
  inline?: boolean
}

const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, inline }) => {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code: ', err)
    }
  }

  const downloadCode = () => {
    const blob = new Blob([children], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${getFileExtension(language)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getFileExtension = (lang: string): string => {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      typescript: 'ts',
      jsx: 'jsx',
      tsx: 'tsx',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      yaml: 'yml',
      xml: 'xml',
      sql: 'sql',
      bash: 'sh',
      shell: 'sh',
      powershell: 'ps1',
      dockerfile: 'dockerfile',
      markdown: 'md'
    }
    return extensions[lang.toLowerCase()] || 'txt'
  }

  const getLanguageDisplayName = (lang: string): string => {
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'javascript': 'JavaScript',
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'json': 'JSON',
      'python': 'Python',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'csharp': 'C#',
      'php': 'PHP',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'sql': 'SQL',
      'bash': 'Bash',
      'sh': 'Shell',
      'powershell': 'PowerShell',
      'dockerfile': 'Dockerfile',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'markdown': 'Markdown',
      'md': 'Markdown',
      'plaintext': 'Plain Text',
      'text': 'Plain Text'
    }
    return languageMap[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1)
  }

  if (inline) {
    return (
      <code className="bg-zinc-800/60 text-zinc-200 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-700/50">
        {children}
      </code>
    )
  }

  const lineCount = children.split('\n').length
  const shouldShowControls = lineCount > 3

  return (
    <div className="relative group my-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 rounded-t-lg border border-zinc-700/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-300 font-medium tracking-wide">
            {getLanguageDisplayName(language)}
          </span>
          {lineCount > 1 && (
            <span className="text-xs text-zinc-500">
              {lineCount} lines
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {shouldShowControls && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
              >
                {showLineNumbers ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              
              {lineCount > 20 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors"
                  onClick={() => setCollapsed(!collapsed)}
                  title={collapsed ? "Expand code" : "Collapse code"}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors"
            onClick={downloadCode}
            title="Download code"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors"
            onClick={copyToClipboard}
            title="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Code content */}
      <div className="border-x border-b border-zinc-700/50 rounded-b-lg overflow-hidden bg-[#1e1e1e]">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers && lineCount > 1}
          wrapLines={true}
          wrapLongLines={true}
          customStyle={{
            margin: 0,
            padding: '16px',
            background: 'transparent',
            fontSize: '13px',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace",
            maxHeight: collapsed ? '200px' : 'none',
            overflow: collapsed ? 'hidden' : 'auto'
          }}
          lineNumberStyle={{
            color: '#6b7280',
            fontSize: '12px',
            paddingRight: '16px',
            userSelect: 'none'
          }}
        >
          {children}
        </SyntaxHighlighter>
        
        {collapsed && lineCount > 20 && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1e1e1e] to-transparent flex items-end justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Show {lineCount - 10} more lines
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const MessageContent: React.FC<{ content: string; role: "user" | "assistant" }> = ({ content, role }) => {
  if (role === "user") {
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </div>
    )
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Code blocks
          // @ts-ignore
          code: CodeBlock,
          
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-zinc-100 mt-6 mb-4 pb-2 border-b border-zinc-700">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-zinc-100 mt-5 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium text-zinc-200 mt-4 mb-2">
              {children}
            </h3>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 text-zinc-300 my-3">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 text-zinc-300 my-3">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-zinc-300 leading-relaxed">
              {children}
            </li>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-600 pl-4 py-2 my-4 bg-zinc-800/30 rounded-r">
              <div className="text-zinc-300 italic">
                {children}
              </div>
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-zinc-700 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-800">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-zinc-200 font-medium border-b border-zinc-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-zinc-300 border-b border-zinc-800">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-zinc-700 my-6" />
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-zinc-300 leading-relaxed my-3">
              {children}
            </p>
          ),
          
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-100">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-200">
              {children}
            </em>
          ),
          
          // Task lists (GitHub-style checkboxes)
          input: ({ type, checked, disabled }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  className="mr-2 accent-blue-500"
                  readOnly
                />
              )
            }
            return null
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [messages, isLoading])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const newMessage: ChatMessage = { 
      role: "user", 
      content: input.trim(),
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, newMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: data.response,
          timestamp: new Date()
        }])
      } else {
        console.error("Failed to send message")
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: "Sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please check your internet connection and try again.",
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSendMessage(e as any)
    }
  }

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy message: ', err)
    }
  }

  const regenerateResponse = async (messageIndex: number) => {
    if (messageIndex === 0 || messages[messageIndex - 1].role !== "user") return
    
    const userMessage = messages[messageIndex - 1].content
    const historyUpToUser = messages.slice(0, messageIndex - 1)
    
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          history: historyUpToUser.map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [
          ...prev.slice(0, messageIndex),
          { 
            role: "assistant", 
            content: data.response,
            timestamp: new Date()
          },
          ...prev.slice(messageIndex + 1)
        ])
      }
    } catch (error) {
      console.error("Error regenerating response:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-4xl bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-out shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 border rounded-full flex flex-col justify-center items-center">

              <Image src={"/logo.svg"} alt="Logo" width={28} height={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Vibe Coding Assistant</h2>
                
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  Clear Chat
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="px-6 pb-4">
            <p className="text-sm text-zinc-500">
              Full markdown support • Code highlighting • Math equations • Tables • Task lists • Copy & download features
            </p>
          </div>
        </div>
        
        {/* Messages Container */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-zinc-950 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-600"
        >
          <div className="p-6 space-y-6">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-zinc-500 py-16">
               <div className="relative w-10 h-10 border rounded-full flex flex-col justify-center items-center">

              <Image src={"/logo.svg"} alt="Logo" width={28} height={28} />
              </div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-300">Welcome to Enhanced AI Assistant</h3>
                <p className="text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
                  I support full markdown formatting, advanced code highlighting, math equations, 
                  tables, and interactive features. Try asking me about complex topics!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Show me a React component with TypeScript",
                    "Create a table comparing databases",
                    "Explain algorithms with math notation",
                    "Generate a task list for a project"
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn("flex items-start gap-4 group", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                 <div className="relative w-10 h-10 border rounded-full flex flex-col justify-center items-center">

              <Image src={"/logo.svg"} alt="Logo" width={28} height={28} />
              </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[90%] rounded-xl shadow-sm relative",
                    msg.role === "user"
                      ? "bg-zinc-900/70 text-white p-4 rounded-br-md"
                      : "bg-zinc-900/80 backdrop-blur-sm text-zinc-100 p-5 rounded-bl-md border border-zinc-800/50",
                  )}
                >
                  <MessageContent content={msg.content} role={msg.role} />
                  
                  {/* Message actions */}
                  <div className={cn(
                    "absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                    msg.role === "user" ? "text-white/70" : "text-zinc-400"
                  )}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-zinc-700/50"
                      onClick={() => copyMessage(msg.content)}
                      title="Copy message"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    
                    {msg.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-zinc-700/50"
                        onClick={() => regenerateResponse(index)}
                        title="Regenerate response"
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  {msg.timestamp && (
                    <div className={cn(
                      "text-xs mt-2 opacity-50",
                      msg.role === "user" ? "text-white" : "text-zinc-500"
                    )}>
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  )}
                </div>
                
                {msg.role === "user" && (
                  <Avatar className="h-9 w-9 border border-zinc-700 bg-zinc-800 shrink-0">
                    <AvatarFallback className="bg-zinc-700 text-zinc-300">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-4 justify-start">
              <div className="relative w-10 h-10 border rounded-full flex flex-col justify-center items-center">

              <Image src={"/logo.svg"} alt="Logo" width={28} height={28} />
              </div>
                <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 p-5 rounded-xl rounded-bl-md flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-sm text-zinc-300">Thinking...</span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-1 bg-zinc-400 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>
        
        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Ask about code, request markdown tables, math equations... (Ctrl+Enter to send)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="min-h-[44px] bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:ring-blue-500/20 pr-12 resize-none"
                style={{ minHeight: '44px' }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded">
                  ⌘↵
                </kbd>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}