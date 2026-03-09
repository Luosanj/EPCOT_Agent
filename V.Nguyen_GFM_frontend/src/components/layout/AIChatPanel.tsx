import { useState, useRef, useEffect } from "react";
import { Bot, ChevronRight, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QueuedRequest {
  userMessageId: string;
  content: string;
}

const API_BASE_URL =
  (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL ||
  "http://localhost:8000";

const TRAINING_PROMPT_SUGGESTIONS = [
  "What do High, Moderate, and Low confidence mean?",
  "What does modelVersion and datasetVersion mean in results?",
  "What is a jobId and how do I use it?",
  "Walk me through how to get predictions for a genomic region.",
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildApiMessagesUntilTarget(messages: Message[], targetUserMessageId: string) {
  const targetIndex = messages.findIndex((msg) => msg.id === targetUserMessageId);
  const scopedMessages = targetIndex >= 0 ? messages.slice(0, targetIndex + 1) : messages;

  // Keep prior chat context, but avoid feeding UI error text back into the model.
  return scopedMessages
    .filter((msg) => !(msg.role === "assistant" && msg.content.startsWith("Error:")))
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
}

function insertAssistantAfterUser(
  messages: Message[],
  userMessageId: string,
  assistantMessage: Message,
) {
  const userIndex = messages.findIndex((msg) => msg.id === userMessageId);
  if (userIndex === -1) return [...messages, assistantMessage];

  return [...messages.slice(0, userIndex + 1), assistantMessage, ...messages.slice(userIndex + 1)];
}

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your Genomic Foundation Model Assistant powered by Qwen3 via vLLM. How can I help you with your research today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [requestQueue, setRequestQueue] = useState<QueuedRequest[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  const isLoading = activeRequestId !== null;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processQueuedRequest = async (queuedRequest: QueuedRequest) => {
    setError(null);

    try {
      const apiMessages = buildApiMessagesUntilTarget(
        messagesRef.current,
        queuedRequest.userMessageId,
      );

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: createId(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) =>
        insertAssistantAfterUser(prev, queuedRequest.userMessageId, assistantMessage),
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response from AI";
      setError(errorMessage);

      const errorMessageBubble: Message = {
        id: createId(),
        role: "assistant",
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages((prev) =>
        insertAssistantAfterUser(prev, queuedRequest.userMessageId, errorMessageBubble),
      );
    } finally {
      setActiveRequestId(null);
    }
  };

  useEffect(() => {
    if (activeRequestId || requestQueue.length === 0) return;

    const nextRequest = requestQueue[0];
    setActiveRequestId(nextRequest.userMessageId);
    setRequestQueue((prev) => prev.slice(1));
    void processQueuedRequest(nextRequest);
  }, [activeRequestId, requestQueue]);

  const enqueueUserMessage = (content: string) => {
    const userMessageId = createId();
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setRequestQueue((prev) => [
      ...prev,
      {
        userMessageId,
        content,
      },
    ]);
  };

  const handleSend = () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    enqueueUserMessage(trimmedInput);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const queueSummary =
    requestQueue.length === 0
      ? isLoading
        ? "Processing request..."
        : "Idle"
      : isLoading
      ? `Processing 1, queued ${requestQueue.length}`
      : `Queued ${requestQueue.length}`;

  if (!isOpen) {
    return (
      <button
        type="button"
        aria-label="Open AI Chat Panel"
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors"
      >
        <ChevronRight className="h-5 w-5 rotate-180" />
      </button>
    );
  }

  return (
    <aside className="w-96 border-l border-border bg-card/90 backdrop-blur flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">GFM Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by Qwen3 + vLLM</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">LLM Queue: {queueSummary}</p>
        {requestQueue.length > 0 && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            Next: {requestQueue[0].content}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.content.startsWith("Error:")
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">U</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted text-foreground rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border">
          {error && (
            <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="mb-2 flex flex-wrap gap-2">
            {TRAINING_PROMPT_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => enqueueUserMessage(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message to send or queue..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon" disabled={!inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
