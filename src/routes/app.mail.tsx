import { createFileRoute } from "@tanstack/react-router";
import { useStore, upsertMail } from "@/lib/store";
import { useState, useMemo } from "react";
import { uid } from "@/lib/id";
import { toast } from "@/components/ui/Toast";

export const Route = createFileRoute("/app/mail")({
  component: MailPage,
});

const SAMPLE_MAILS = [
  {
    from: "team@notionclone.app",
    subject: "Welcome to Notion Mail (demo)",
    body: "This is a demo of the Mail experience.\n\nAuto-labels via AI, scheduling integrated with Calendar, and Mail Actions that create pages in Notion.",
  },
  {
    from: "alice@example.com",
    subject: "Customer feedback",
    body: "Hey! I love the table view but would like to filter by multiple statuses at once. Any plans for that?",
  },
  {
    from: "bob@example.com",
    subject: "Meeting tomorrow?",
    body: "Can we sync at 10am on the new roadmap? I'd like to walk through the Q4 priorities.",
  },
];

function MailPage() {
  const mails = useStore((s) => s.mails);
  const [selected, setSelected] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ to: string; subject: string; body: string } | null>(null);

  const list = useMemo(() => Object.values(mails).filter((m) => !m.trash && !m.archived).sort((a, b) => b.receivedAt - a.receivedAt), [mails]);
  const current = selected ? mails[selected] : null;

  function seed() {
    SAMPLE_MAILS.forEach((s, i) => {
      const id = uid("mail");
      upsertMail({
        id,
        from: s.from,
        to: ["me@example.com"],
        subject: s.subject,
        body: s.body,
        receivedAt: Date.now() - i * 60_000 * 30,
        read: false,
        starred: false,
        archived: false,
        trash: false,
        labels: i === 1 ? ["customer-feedback"] : i === 2 ? ["scheduling"] : [],
        threadId: id,
        snippet: s.body.slice(0, 80),
      });
    });
  }

  return (
    <div className="flex h-full">
      <aside className="w-72 border-r border-border bg-sidebar/40 flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Inbox</h2>
          <button onClick={() => setComposing({ to: "", subject: "", body: "" })} className="text-xs bg-primary text-primary-foreground rounded px-2 py-1" data-testid="mail-compose">
            Compose
          </button>
        </div>
        {list.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            <p>Your inbox is empty.</p>
            <button onClick={seed} className="mt-2 text-xs underline" data-testid="mail-seed">Load sample emails</button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">
          {list.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelected(m.id);
                if (!m.read) upsertMail({ ...m, read: true });
              }}
              className={`w-full text-left p-3 border-b border-border ${selected === m.id ? "bg-accent" : "hover:bg-accent/50"} ${!m.read ? "font-medium" : ""}`}
              data-testid={`mail-${m.id}`}
            >
              <div className="flex justify-between text-xs">
                <span className="truncate">{m.from}</span>
                <span className="text-muted-foreground">{new Date(m.receivedAt).toLocaleDateString()}</span>
              </div>
              <div className="text-sm truncate mt-0.5">{m.subject}</div>
              <div className="text-xs text-muted-foreground truncate">{m.snippet}</div>
              {m.labels.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {m.labels.map((l) => (
                    <span key={l} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">{l}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {composing ? (
          <ComposeMail compose={composing} onClose={() => setComposing(null)} />
        ) : current ? (
          <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-3 text-sm text-muted-foreground">From: {current.from}</div>
            <h2 className="text-2xl font-bold mb-2">{current.subject}</h2>
            <div className="text-xs text-muted-foreground mb-4">{new Date(current.receivedAt).toLocaleString()}</div>
            <pre className="whitespace-pre-wrap text-sm font-sans">{current.body}</pre>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">Select an email to read.</div>
        )}
      </main>
    </div>
  );
}

function ComposeMail({ compose, onClose }: { compose: { to: string; subject: string; body: string }; onClose: () => void }) {
  const [state, setState] = useState(compose);
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="font-semibold mb-3">New message</h2>
      <input
        value={state.to}
        onChange={(e) => setState({ ...state, to: e.target.value })}
        placeholder="To"
        className="w-full border border-input rounded px-2 py-1 mb-2 text-sm bg-background"
        data-testid="compose-to"
      />
      <input
        value={state.subject}
        onChange={(e) => setState({ ...state, subject: e.target.value })}
        placeholder="Subject"
        className="w-full border border-input rounded px-2 py-1 mb-2 text-sm bg-background"
        data-testid="compose-subject"
      />
      <textarea
        value={state.body}
        onChange={(e) => setState({ ...state, body: e.target.value })}
        placeholder="Body"
        className="w-full border border-input rounded px-2 py-1 text-sm bg-background min-h-[200px]"
        data-testid="compose-body"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            toast("Email queued (demo — no real SMTP).", "success");
            onClose();
          }}
          className="bg-primary text-primary-foreground text-sm rounded px-3 py-1.5"
          data-testid="compose-send"
        >
          Send
        </button>
        <button onClick={onClose} className="text-sm rounded px-3 py-1.5 hover:bg-accent">Cancel</button>
      </div>
    </div>
  );
}
