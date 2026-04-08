import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/UI/button";
import {
  Bot,
  Send,
  Loader2,
  Paperclip,
  FileText,
  X,
  PlayCircle,
  Dna,
  Zap,
  MessageSquare,
  FlaskConical,
  Download,
} from "lucide-react";
import { uploadBamFile, sendChatMessage, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { ResultsPanel, type JobMeta } from "@/components/ResultsPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  isAction?: boolean;
  visualSummary?: {
    high: number;
    moderate: number;
    low: number;
    total: number;
  };
  downloadUrl?: string;
  plot1dUrl?: string;
  plot2dUrl?: string;
}

type Phase = "empty" | "chatting" | "results";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Suggestion chips (shown in empty state) ──────────────────────────────────

const SUGGESTIONS = [
  { icon: Dna, label: "Upload a BAM file to start" },
  { icon: Zap, label: "Predict enhancer activity (EFP)" },
  { icon: FlaskConical, label: "Analyze a genomic region" },
  { icon: MessageSquare, label: "What does EPCOT predict?" },
];

// ─── Shared input bar component ────────────────────────────────────────────────

interface InputBarProps {
  input: string;
  setInput: (v: string) => void;
  pendingFile: File | null;
  clearPendingFile: () => void;
  onSend: () => void;
  onAttach: () => void;
  isLoading: boolean;
  compact?: boolean; // true when in split-view chat column
}

function InputBar({
  input,
  setInput,
  pendingFile,
  clearPendingFile,
  onSend,
  onAttach,
  isLoading,
  compact = false,
}: InputBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className={`${compact ? "px-3 py-2" : "px-4 py-3"
        } bg-card/80 backdrop-blur border border-border rounded-2xl shadow-sm space-y-2`}
    >
      {/* File chip */}
      {pendingFile && (
        <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5 text-xs w-fit max-w-full">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium truncate max-w-[200px]">{pendingFile.name}</span>
          <span className="text-muted-foreground shrink-0">
            ({(pendingFile.size / (1024 * 1024)).toFixed(1)} MB)
          </span>
          <button
            onClick={clearPendingFile}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove file"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Paperclip */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary rounded-xl"
          onClick={onAttach}
          aria-label="Attach .bam file"
          title="Attach .bam file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Textarea */}
        <textarea
          id="chat-message-input"
          rows={1}
          placeholder={
            pendingFile
              ? "Add a message or just send the file…"
              : "Ask anything about your genomic data…"
          }
          className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none leading-relaxed py-1 max-h-40 overflow-y-auto"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // auto-grow
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        {/* Send */}
        <Button
          size="icon"
          className="h-8 w-8 shrink-0 rounded-xl"
          onClick={onSend}
          disabled={(!input.trim() && !pendingFile) || isLoading}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
      >
        {isUser ? "U" : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className={`flex flex-col gap-2 max-w-[75%]`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : msg.isAction
              ? "bg-primary/8 text-foreground border border-primary/20 rounded-tl-sm"
              : "bg-muted text-foreground rounded-tl-sm"
            }`}
        >
          {msg.content}
        </div>
        {msg.visualSummary && (
          <div className="bg-card/80 border border-border rounded-xl p-3 shadow-sm text-xs space-y-2 w-full animate-in fade-in slide-in-from-bottom-2">
            <p className="font-medium text-primary">Confidence Overview</p>
            <div className="flex rounded-full overflow-hidden h-2">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(msg.visualSummary.high / msg.visualSummary.total) * 100}%` }} title="High" />
              <div className="bg-amber-400 transition-all" style={{ width: `${(msg.visualSummary.moderate / msg.visualSummary.total) * 100}%` }} title="Moderate" />
              <div className="bg-muted-foreground/30 transition-all" style={{ width: `${(msg.visualSummary.low / msg.visualSummary.total) * 100}%` }} title="Low" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />High <strong>{msg.visualSummary.high}</strong></span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />Moderate <strong>{msg.visualSummary.moderate}</strong></span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />Low <strong>{msg.visualSummary.low}</strong></span>
            </div>
          </div>
        )}
        {(msg.downloadUrl || msg.plot1dUrl || msg.plot2dUrl) && (
          <div className="flex flex-col gap-3 mt-1 animate-in fade-in slide-in-from-bottom-2 w-full max-w-[400px]">
            {msg.plot1dUrl && (
              <a href={`${API_BASE_URL}${msg.plot1dUrl}`} target="_blank" rel="noopener noreferrer">
                <img src={`${API_BASE_URL}${msg.plot1dUrl}`} alt="1D Plot Visualization" className="rounded-xl border border-border w-full object-contain bg-background/50 shadow-sm transition-transform hover:scale-[1.02]" />
              </a>
            )}
            {msg.plot2dUrl && (
              <a href={`${API_BASE_URL}${msg.plot2dUrl}`} target="_blank" rel="noopener noreferrer">
                <img src={`${API_BASE_URL}${msg.plot2dUrl}`} alt="2D Plot Visualization" className="rounded-xl border border-border w-full object-contain bg-background/50 shadow-sm transition-transform hover:scale-[1.02]" />
              </a>
            )}
            {msg.downloadUrl && (
              <a href={`${API_BASE_URL}${msg.downloadUrl}`} download target="_blank" rel="noopener noreferrer" className="self-start">
                <Button variant="outline" size="sm" className="h-8 gap-2 bg-card">
                  <Download className="h-3.5 w-3.5" /> 
                  Download Results
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function NewAnalysis() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [jobMeta, setJobMeta] = useState<JobMeta | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      setIsLoading(true);
      fetch(`${API_BASE_URL}/sessions/${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages && data.messages.length > 0) {
            setPhase("chatting");
            setMessages(
              data.messages.map((m: any) => ({
                id: m.id.toString(),
                role: m.role,
                content: m.content,
                isAction: m.is_action,
                visualSummary: m.visual_summary,
                downloadUrl: m.download_url,
                plot1dUrl: m.plot_1d_url,
                plot2dUrl: m.plot_2d_url,
              }))
            );
          }
        })
        .catch((err) => console.error("Could not fetch session messages:", err))
        .finally(() => setIsLoading(false));
    }
  }, []);

  const addMessage = (
    role: Message["role"],
    content: string,
    isAction?: boolean,
    visualSummary?: Message["visualSummary"],
    downloadUrl?: string,
    plot1dUrl?: string,
    plot2dUrl?: string
  ) => {
    setMessages((prev) => [
      ...prev,
      { id: createId(), role, content, isAction, visualSummary, downloadUrl, plot1dUrl, plot2dUrl },
    ]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      if (!f.name.endsWith(".bam")) {
        toast.error("Invalid file type. Please upload a .bam file.");
        return;
      }
      setPendingFile(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingFile) return;

    // Switch to "chatting" on first send
    if (phase === "empty") setPhase("chatting");

    if (pendingFile) {
      const file = pendingFile;
      setPendingFile(null);
      const userContent = input.trim()
        ? `[Attached: ${file.name}]  ${input.trim()}`
        : `[Attached: ${file.name}]`;
      addMessage("user", userContent);
      setInput("");
      setIsLoading(true);
      try {
        await uploadBamFile(file);
        setUploadedFile(file);
        addMessage(
          "agent",
          `✅ ${file.name} uploaded and validated.\n\nPlease provide the genomic region you'd like to analyze — for example:\n\`chr17, 41196312, 41209800\`\n\nThen tell me which modality: EFP, GEP, or EAP.`,
        );
      } catch {
        addMessage("agent", "❌ Upload failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const userText = input.trim();
    addMessage("user", userText);
    setInput("");
    setIsLoading(true);
    try {
      const response = await sendChatMessage(userText);
      addMessage(
        "agent",
        response?.reply ?? "I encountered an error returning a response.",
        false,
        undefined,
        response?.download_url,
        response?.plot_1d_url,
        response?.plot_2d_url
      );
    } catch {
      addMessage("agent", "Sorry, I'm having trouble connecting to the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunPrediction = () => {
    if (!uploadedFile) return;
    addMessage("agent", "🔬 Running EPCOT prediction… Results will appear shortly.", true);
    const meta: JobMeta = {
      filename: uploadedFile.name,
      region: "chr17:41,196,312–41,209,800",
      modality: "EFP",
      timestamp: new Date(),
    };
    setTimeout(() => {
      setJobMeta(meta);
      setPhase("results");
      addMessage("agent", "✅ Prediction complete! Found 5 loci in this region. Detailed tracking and download options are available in the Results Panel on the right.", false, {
        high: 2,
        moderate: 2,
        low: 1,
        total: 5,
      });
    }, 1200);
  };

  const handleCloseResults = () => {
    setPhase("chatting");
    setJobMeta(null);
  };

  const handleSuggestion = (label: string) => {
    setInput(label);
  };

  // ── Shared hidden file input ──────────────────────────────────────────────
  const fileInputEl = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".bam"
      className="hidden"
      onChange={handleFileSelect}
      aria-label="Upload BAM file"
      id="bam-file-input"
    />
  );

  // ── PHASE: empty ─────────────────────────────────────────────────────────
  if (phase === "empty") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        {fileInputEl}

        {/* Heading */}
        <div className="mb-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Dna className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            What would you like to analyze?
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload a <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">.bam</code> file or ask me anything about genomic predictions.
          </p>
        </div>

        {/* Input box */}
        <div className="w-full max-w-2xl">
          <InputBar
            input={input}
            setInput={setInput}
            pendingFile={pendingFile}
            clearPendingFile={() => setPendingFile(null)}
            onSend={handleSend}
            onAttach={() => fileInputRef.current?.click()}
            isLoading={isLoading}
          />
        </div>

        {/* Suggestion chips */}
        <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-2xl">
          {SUGGESTIONS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => handleSuggestion(label)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── PHASE: chatting (full-screen) ─────────────────────────────────────────
  if (phase === "chatting") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {fileInputEl}

        {/* Run prediction pill — floats at top when file is ready */}
        {uploadedFile && (
          <div className="shrink-0 flex justify-center pt-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs rounded-full shadow-sm"
              onClick={handleRunPrediction}
              disabled={isLoading}
            >
              <PlayCircle className="h-3.5 w-3.5 text-primary" />
              Run Prediction — {uploadedFile.name}
            </Button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6">
          <div className="max-w-2xl mx-auto px-4 space-y-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Pinned input */}
        <div className="shrink-0 pb-5 px-4">
          <div className="max-w-2xl mx-auto">
            <InputBar
              input={input}
              setInput={setInput}
              pendingFile={pendingFile}
              clearPendingFile={() => setPendingFile(null)}
              onSend={handleSend}
              onAttach={() => fileInputRef.current?.click()}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE: results (40 / 60 split) ────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {fileInputEl}

      {/* Chat column — 40% */}
      <div className="w-[40%] flex flex-col h-full border-r border-border">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">EPCOT Assistant</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pinned input */}
        <div className="shrink-0 p-3">
          <InputBar
            input={input}
            setInput={setInput}
            pendingFile={pendingFile}
            clearPendingFile={() => setPendingFile(null)}
            onSend={handleSend}
            onAttach={() => fileInputRef.current?.click()}
            isLoading={isLoading}
            compact
          />
        </div>
      </div>

      {/* Results column — 60% */}
      <div className="w-[60%] h-full">
        {jobMeta && <ResultsPanel jobMeta={jobMeta} onClose={handleCloseResults} />}
      </div>
    </div>
  );
}
