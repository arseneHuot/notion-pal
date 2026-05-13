import { useEffect, useRef, useState } from "react";
import { useStore, consumeAICredits } from "@/lib/store";
import { askAI } from "@/lib/ai-server";
import { Sparkles, X, Send } from "lucide-react";
import { stripHtml } from "@/lib/text";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { pageId: string; title: string }[];
}

/** Minimal Markdown renderer for assistant messages. Supports fenced code
 *  blocks (```lang), inline code, **bold**, *italic*, and links. */
function MarkdownText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  // Split on triple-backtick fences first.
  const fenceRe = /```([\w-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = fenceRe.exec(text)) !== null) {
    if (m.index > last) parts.push(<InlineText key={idx++} text={text.slice(last, m.index)} />);
    parts.push(
      <pre key={idx++} className="bg-card border border-border rounded p-2 my-1 overflow-x-auto text-xs">
        <code className="font-mono">{m[2]}</code>
      </pre>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<InlineText key={idx++} text={text.slice(last)} />);
  return <div className="whitespace-pre-wrap space-y-1">{parts}</div>;
}

/** Lightweight block-level renderer that recognises `-`/`*` bullets and
 *  `N.` numbered lists between fenced code blocks. */
function InlineText({ text }: { text: string }) {
  // First handle leading-line list markers.
  const lines = text.split(/\n/);
  const blocks: React.ReactNode[] = [];
  let listItems: { ordered: boolean; lines: string[] } | null = null;
  let key = 0;
  const flushList = () => {
    if (!listItems) return;
    const items = listItems.lines.map((l, idx) => <li key={idx}><InlineMarks text={l} /></li>);
    blocks.push(
      listItems.ordered
        ? <ol key={`l${key++}`} className="list-decimal pl-5 my-1">{items}</ol>
        : <ul key={`l${key++}`} className="list-disc pl-5 my-1">{items}</ul>,
    );
    listItems = null;
  };
  for (const line of lines) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet) {
      if (!listItems || listItems.ordered) {
        flushList();
        listItems = { ordered: false, lines: [] };
      }
      listItems.lines.push(bullet[1]);
    } else if (numbered) {
      if (!listItems || !listItems.ordered) {
        flushList();
        listItems = { ordered: true, lines: [] };
      }
      listItems.lines.push(numbered[1]);
    } else {
      flushList();
      blocks.push(line === "" ? <br key={`b${key++}`} /> : <div key={`p${key++}`}><InlineMarks text={line} /></div>);
    }
  }
  flushList();
  return <>{blocks}</>;
}

function InlineMarks({ text }: { text: string }) {
  // Parse inline marks. Order: links → bold → italic (with `_` alt) →
  // inline code.
  const out: React.ReactNode[] = [];
  const tokenRe = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] !== undefined) out.push(<strong key={i++}>{m[2]}</strong>);
    else if (m[3] !== undefined) out.push(<strong key={i++}>{m[3]}</strong>);
    else if (m[4] !== undefined) out.push(<em key={i++}>{m[4]}</em>);
    else if (m[5] !== undefined) out.push(<em key={i++}>{m[5]}</em>);
    else if (m[6] !== undefined) out.push(<code key={i++} className="bg-muted/80 px-1 rounded font-mono text-xs">{m[6]}</code>);
    else if (m[7] !== undefined && m[8] !== undefined) {
      const href = m[8];
      const safe = /^(https?:|mailto:|#|\/)/i.test(href) ? href : "#";
      out.push(
        <a key={i++} href={safe} target="_blank" rel="noopener noreferrer" className="underline">
          {m[7]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function aiChatStorageKey(userId: string | null | undefined): string {
  // Namespaced per-user so threads don't leak across accounts on the same
  // browser (B-1802). Falls back to a "guest" bucket when no user is set.
  return `notion-clone:ai-chat:${userId ?? "guest"}`;
}

function loadStoredMessages(userId: string | null | undefined): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(aiChatStorageKey(userId));
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
  const currentUser = useStore((s) => s.currentUser);
  const userId = currentUser?.id;
  const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages(userId));

  // Reload thread when the signed-in user changes.
  useEffect(() => {
    setMessages(loadStoredMessages(userId));
  }, [userId]);
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
    function showWith(e: Event) {
      const detail = (e as CustomEvent<{ selected: string; pageTitle?: string }>).detail;
      setOpen(true);
      if (detail?.selected) {
        const snippet = detail.selected.slice(0, 200);
        // Embed parent page title when provided so the model has context
        // (I-4304). Falls back to the original "Ask AI about" framing.
        const quoted = detail.pageTitle
          ? `On page "${detail.pageTitle}", help me with: "${snippet}"`
          : `Ask AI about: "${snippet}"`;
        setInput(quoted);
      }
    }
    function onKey(e: KeyboardEvent) {
      // Cmd/Ctrl+J toggles the AI panel (Notion-style shortcut, B-4119).
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("open-ai-chat", show);
    window.addEventListener("open-ai-chat-with", showWith);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-ai-chat", show);
      window.removeEventListener("open-ai-chat-with", showWith);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Persist messages across reloads (B-1722 / B-1618), per-user (B-1802).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(aiChatStorageKey(userId), JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore quota errors
    }
  }, [messages, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Find up to N relevant pages by keyword overlap. Used both as a
  // pre-filter (we ship the snippet to Gemini for context) and as the
  // local fallback when the LLM is unreachable.
  function findRelevantPages(question: string, limit = 5) {
    const q = question.toLowerCase();
    return Object.values(pages)
      .filter((p) => !p.isInTrash)
      .map((p) => {
        let score = 0;
        let bestSnippet = "";
        if (p.title.toLowerCase().includes(q)) score += 5;
        for (const bid of p.blocks ?? []) {
          const b = blocks[bid];
          if (b && "content" in b && typeof b.content === "string") {
            const txt = stripHtml(b.content);
            const txtLower = txt.toLowerCase();
            if (txtLower.includes(q)) {
              score += 2;
              if (!bestSnippet) bestSnippet = txt.slice(0, 280);
            }
            for (const w of q.split(/\s+/)) {
              if (w && w.length >= 2 && txtLower.includes(w)) score += 0.5;
            }
          }
        }
        return { p, score, snippet: bestSnippet };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Legacy keyword-only answer — kept as the fallback when the Gemini
   * server function errors out so the panel never feels broken.
   */
  function pseudoAnswer(question: string) {
    const matches = findRelevantPages(question, 3);

    let answer = "";
    // Recognise simple code-asking prompts so we can demo code-block rendering.
    const wantsCode = /(\bcode\b|\bsnippet\b|\bsample\b|\bpython\b|\bjavascript\b|\bts\b|\bsql\b)/i.test(question);
    if (matches.length === 0) {
      answer = `I couldn't find anything specific in your workspace about "${question}". Here are some ideas:\n\n- Create a new page to capture this\n- Try a more specific search\n- Browse Recents from Home`;
      if (wantsCode) {
        const lang = /python/i.test(question) ? "python" : /javascript|\bjs\b/i.test(question) ? "javascript" : /\bsql\b/i.test(question) ? "sql" : "";
        const snippet =
          lang === "python"
            ? "def hello():\n    print('Hello from NotionClone')"
            : lang === "sql"
              ? "SELECT * FROM pages WHERE title ILIKE '%notion%'"
              : "function hello() { console.log('Hello from NotionClone'); }";
        answer += "\n\nHere's a starter snippet:\n\n```" + lang + "\n" + snippet + "\n```";
      }
    } else {
      answer = `Based on your workspace, here's what I found about "${question}":\n\n`;
      matches.forEach((m, i) => {
        answer += `${i + 1}. **${m.p.title || "Untitled"}** — ${m.p.icon ?? "📄"} (relevance ${Math.round(m.score)})\n`;
      });
      answer += `\nWould you like a summary of any of these?`;
      if (wantsCode) {
        const lang = /python/i.test(question) ? "python" : /javascript|\bjs\b/i.test(question) ? "javascript" : /\bsql\b/i.test(question) ? "sql" : "";
        const count = matches.length;
        const snippet =
          lang === "python"
            ? `# adjust to your data\nprint(f'found {${count}} results')`
            : `// adjust to your data\nconsole.log('found ' + ${count} + ' results')`;
        answer += "\n\nQuick code template:\n\n```" + lang + "\n" + snippet + "\n```";
      }
    }
    return { answer, sources: matches.map((m) => ({ pageId: m.p.id, title: m.p.title || "Untitled" })) };
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    if (busy) return; // guard duplicate sends (B-6203)
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);

    // Pre-filter relevant pages by keyword so we ship Gemini just the
    // sources that matter (keeps the prompt small + fast). The server
    // fn echoes them back so the UI can render citation chips.
    const relevant = findRelevantPages(text, 5);
    const sources = relevant.map((m) => ({
      pageId: m.p.id,
      title: m.p.title || "Untitled",
      snippet: m.snippet,
    }));

    // Find the page title for context if the user is currently on a page.
    const pageTitleEl =
      typeof document !== "undefined"
        ? (document.querySelector('[data-testid="page-title"]') as HTMLElement | null)
        : null;
    const pageTitle = pageTitleEl?.innerText?.trim() || undefined;

    try {
      const res = await askAI({ data: { prompt: text, pageTitle, sources } });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
        },
      ]);
      // Charge credits only when the request actually succeeded.
      if (!res.error) consumeAICredits(5);
    } catch (err) {
      // Network / transport error — fall back to local keyword answer so
      // the panel never silently hangs.
      const fallback = pseudoAnswer(text);
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ Couldn't reach the AI server (${msg}). Falling back to keyword search:\n\n${fallback.answer}`,
          sources: fallback.sources,
        },
      ]);
    } finally {
      setBusy(false);
    }
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
        <button
          onClick={() => setOpen(false)}
          className="p-1 hover:bg-accent rounded"
          aria-label="Close AI chat"
          title="Close"
          data-testid="close-ai"
        >
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
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`} data-testid={`ai-msg-${i}`} data-role={m.role}>
            <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.role === "assistant" ? (
                <MarkdownText text={m.content} />
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
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
      <form
        className="p-3 border-t border-border"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return; // Don't queue submissions while a reply streams (B-6203).
          send();
        }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits, Shift+Enter inserts a newline (Notion / Slack
              // convention). The form's onSubmit handles validation.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (busy) return; // ignore while busy (B-6203)
                send();
              }
            }}
            placeholder="Ask anything... (Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-background border border-input rounded px-2 py-1 text-sm resize-none min-h-[32px] max-h-40 overflow-y-auto"
            style={{ height: "auto" }}
            ref={(el) => {
              // Auto-grow up to ~6 lines so multi-line prompts stay visible
              // without a scrollbar until they overflow.
              if (el) {
                el.style.height = "auto";
                el.style.height = Math.min(160, el.scrollHeight) + "px";
              }
            }}
            data-testid="ai-input"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="bg-primary text-primary-foreground rounded p-1.5 disabled:opacity-50"
            aria-label="Send message"
            title="Send"
            data-testid="ai-send"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
      <div className="px-3 pb-3 text-[10px] text-muted-foreground">
        Models: GPT-5.2 · Claude Opus 4.7 · Gemini 3 · Auto (demo)
      </div>
    </div>
  );
}
