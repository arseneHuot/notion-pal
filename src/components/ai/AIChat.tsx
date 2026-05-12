import { useEffect, useRef, useState } from "react";
import { useStore, consumeAICredits } from "@/lib/store";
import { Sparkles, X, Send } from "lucide-react";
import { stripHtml } from "@/lib/text";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { pageId: string; title: string }[];
}

const AI_CHAT_STORAGE_KEY = "notion-clone:ai-chat";

function loadStoredMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AI_CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(-50);
  } catch {
    // ignore
  }
  return [];
}

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const workspace = useStore((s) => (s.currentWorkspaceId ? s.workspaces[s.currentWorkspaceId] : null));
  const pages = useStore((s) => s.pages);
  const blocks = useStore((s) => s.blocks);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function show() {
      setOpen(true);
    }
    window.addEventListener("open-ai-chat", show);
    return () => window.removeEventListener("open-ai-chat", show);
  }, []);

  // Persist messages across reloads (B-1722 / B-1618).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function pseudoAnswer(question: string) {
    const q = question.toLowerCase();
    // Naive semantic search across pages
    const matches = Object.values(pages)
      .filter((p) => !p.isInTrash)
      .map((p) => {
        let score = 0;
        if (p.title.toLowerCase().includes(q)) score += 5;
        for (const bid of p.blocks) {
          const b = blocks[bid];
          if (b && "content" in b && typeof b.content === "string") {
            const txt = stripHtml(b.content).toLowerCase();
            if (txt.includes(q)) score += 2;
            for (const w of q.split(/\s+/)) {
              if (w && txt.includes(w)) score += 0.5;
            }
          }
        }
        return { p, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    let answer = "";
    if (matches.length === 0) {
      answer = `I couldn't find anything specific in your workspace about "${question}". Here are some ideas:\n\n- Create a new page to capture this\n- Try a more specific search\n- Browse Recents from Home`;
    } else {
      answer = `Based on your workspace, here's what I found about "${question}":\n\n`;
      matches.forEach((m, i) => {
        answer += `${i + 1}. **${m.p.title || "Untitled"}** — ${m.p.icon ?? "📄"} (relevance ${Math.round(m.score)})\n`;
      });
      answer += `\nWould you like a summary of any of these?`;
    }
    return { answer, sources: matches.map((m) => ({ pageId: m.p.id, title: m.p.title || "Untitled" })) };
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    setTimeout(() => {
      const { answer, sources } = pseudoAnswer(text);
      setMessages((m) => [...m, { role: "assistant", content: answer, sources }]);
      consumeAICredits(5); // simple cost model
      setBusy(false);
    }, 600);
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-card border border-border rounded-lg shadow-xl z-40 flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Sparkles className="size-4 text-violet-500" />
        <span className="font-semibold text-sm">Ask AI</span>
        <span className="ml-auto text-xs text-muted-foreground">{workspace?.aiCredits ?? 0} credits</span>
        <button
          onClick={() => setMessages([])}
          className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          title="Start a new thread"
          aria-label="New thread"
          data-testid="ai-new-thread"
        >
          New
        </button>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-accent rounded" data-testid="close-ai">
          <X className="size-4" />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground italic">
            Ask anything about your workspace. I can search pages, summarise content, draft text, and more.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="opacity-70">Sources:</div>
                  {m.sources.map((s) => (
                    <div key={s.pageId}>• {s.title}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">Thinking…</div>}
      </div>
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask anything..."
            className="flex-1 bg-background border border-input rounded px-2 py-1 text-sm"
            data-testid="ai-input"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="bg-primary text-primary-foreground rounded p-1.5 disabled:opacity-50"
            data-testid="ai-send"
          >
            <Send className="size-4" />
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          Models: GPT-5.2 · Claude Opus 4.7 · Gemini 3 · Auto (demo)
        </div>
      </div>
    </div>
  );
}
