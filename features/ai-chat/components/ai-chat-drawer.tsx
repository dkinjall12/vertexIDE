"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react" // Assuming NextAuth for user session

interface AIChatDrawerProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  id?: string // Optional, for messages from DB
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose }) => {
  const { data: session } = useSession()
  const userId = session?.user?.id // Get user ID from session
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Fetch chat history on component mount
  useEffect(() => {
    if (isOpen && userId) {
      const fetchHistory = async () => {
        setIsLoading(true)
        try {
          const response = await fetch(`/api/chat?userId=${userId}`)
          if (response.ok) {
            const data = await response.json()
            setMessages(data.messages)
          } else {
            console.error("Failed to fetch chat history")
          }
        } catch (error) {
          console.error("Error fetching chat history:", error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchHistory()
    }
  }, [isOpen, userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !userId) return

    const newMessage: ChatMessage = { role: "user", content: input }
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
          userId,
          message: input,
          history: messages.map((msg) => ({ role: msg.role, content: msg.content })), // Send full history
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }])
      } else {
        console.error("Failed to send message")
        setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not get a response." }])
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Network issue or server error." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[80vh] flex flex-col">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" /> AI Assistant Chat
          </DrawerTitle>
          <DrawerDescription>Chat with your AI coding assistant.</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-8">Start a conversation with your AI assistant!</div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn("flex items-start gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="AI" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[70%] p-3 rounded-lg shadow-sm",
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none dark:bg-gray-800 dark:text-gray-200",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={session?.user?.image || "/placeholder.svg?height=32&width=32"} alt="You" />
                    <AvatarFallback>
                      {session?.user?.name ? session.user.name.charAt(0) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 justify-start">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="AI" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4 mr-2" /> Send
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
