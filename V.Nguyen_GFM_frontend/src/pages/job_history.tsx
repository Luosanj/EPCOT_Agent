import { useState, useEffect } from "react";
import { Bot, Clock, ChevronRight, Dna } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Session {
  session_id: string;
  title: string;
  filename: string;
  created_at: string;
}

export function JobHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/sessions`)
      .then(res => res.json())
      .then(data => {
        if (data.sessions) setSessions(data.sessions);
      })
      .catch(err => console.error("Could not fetch sessions:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Job History</h1>
          <p className="text-muted-foreground text-sm">Review past analyses and resume previous chat sessions.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-muted-foreground text-sm animate-pulse">Loading past jobs...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No history yet</h3>
            <p className="text-sm text-muted-foreground">Your past BAM file uploads and EPCOT prediction sessions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <a 
                key={session.session_id} 
                href={`/?session_id=${session.session_id}`}
                className="group flex items-center justify-between bg-card hover:bg-muted/50 border border-border p-4 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Dna className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{session.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(session.created_at).toLocaleString()}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                      <span>{session.filename}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
