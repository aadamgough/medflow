"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChatSession, 
  ChatMessage, 
  streamChatMessage,
  getChatSession,
  deleteChatSession 
} from "@/lib/api";

interface ChatPanelProps {
  documentId: string;
}

export function ChatPanel({ documentId }: ChatPanelProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSession = useCallback(async () => {
    try {
      const { session } = await getChatSession(documentId);
      setSession(session);
    } catch (err) {
      console.error("Failed to load chat session:", err);
    }
  }, [documentId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streamedContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const message = input.trim();
    if (!message || isLoading || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    setInput("");

    const userMessage: ChatMessage = {
      id: "temp-" + Date.now(),
      sessionId: session?.id || "",
      role: "USER",
      content: message,
      sources: null,
      createdAt: new Date().toISOString(),
    };

    const currentSessionWithUser: ChatSession = {
      id: session?.id || "",
      userId: session?.userId || "",
      documentId,
      title: session?.title || null,
      createdAt: session?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [...(session?.messages || []), userMessage],
    };
    
    setSession(currentSessionWithUser);

    let currentContent = "";
    
    setStreamedContent("");

    try {
      await streamChatMessage(
        documentId,
        message,
        (chunk) => {
          currentContent += chunk;
          setStreamedContent(currentContent);
        },
        (data) => {
          const updatedMessages = currentSessionWithUser.messages.filter(m => m.role !== "ASSISTANT" || m.id !== "streaming");
          updatedMessages.push({
            id: data.assistantMessageId,
            sessionId: data.sessionId,
            role: "ASSISTANT",
            content: currentContent,
            sources: null,
            createdAt: new Date().toISOString(),
          });
          
          setSession({
            ...currentSessionWithUser,
            id: data.sessionId,
            messages: updatedMessages,
          });
          setStreamedContent("");
        },
        (err) => {
          setError(err);
          const filteredMessages = currentSessionWithUser.messages.filter(m => m.id !== userMessage.id);
          setSession({
            ...currentSessionWithUser,
            messages: filteredMessages,
          });
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      const filteredMessages = currentSessionWithUser.messages.filter(m => m.id !== userMessage.id);
      setSession({
        ...currentSessionWithUser,
        messages: filteredMessages,
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClearChat = async () => {
    if (!session?.id) {
      setSession(null);
      return;
    }

    try {
      await deleteChatSession(session.id);
      setSession(null);
    } catch (err) {
      console.error("Failed to delete chat session:", err);
    }
  };

  const allMessages = session?.messages || [];
  const displayMessages = isStreaming 
    ? [...allMessages, { 
        id: "streaming", 
        sessionId: session?.id || "", 
        role: "ASSISTANT" as const, 
        content: streamedContent, 
        sources: null, 
        createdAt: new Date().toISOString() 
      }]
    : allMessages;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="text-xs text-muted-foreground animate-pulse">Processing...</span>
          )}
        </div>
        {session?.id && !isStreaming && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium text-foreground mb-2">
              Ask questions about this document
            </h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              I can help you find specific information, summarize sections, or answer questions about the document content.
            </p>
          </div>
        ) : (
          displayMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ASSISTANT" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "USER"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "ASSISTANT" ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                )}
                {msg.id === "streaming" && isStreaming && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                )}
              </div>

              {msg.role === "USER" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading || isStreaming}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading || isStreaming}
            size="icon"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
