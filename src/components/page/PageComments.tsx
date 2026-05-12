import { useMemo, useState } from "react";
import { useStore, addComment, resolveComment, deleteComment } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { X, Send, Check } from "lucide-react";

export function PageComments({ pageId, open, onClose }: { pageId: string; open: boolean; onClose: () => void }) {
  const comments = useStore((s) => s.comments);
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const pageComments = useMemo(
    () => Object.values(comments).filter((c) => c.pageId === pageId && !c.blockId && (showResolved || !c.resolved)),
    [comments, pageId, showResolved],
  );

  if (!open) return null;

  return (
    <div className="fixed top-0 right-0 bottom-0 w-80 bg-card border-l border-border shadow-lg z-30 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Comments</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent" data-testid="close-comments">
          <X className="size-4" />
        </button>
      </div>
      <div className="px-3 py-1 text-xs border-b border-border">
        <label className="flex items-center gap-1 text-muted-foreground">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pageComments.length === 0 && (
          <div className="text-xs text-muted-foreground italic">No comments yet.</div>
        )}
        {pageComments.map((c) => (
          <div key={c.id} className={`rounded border border-border p-2 ${c.resolved ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="size-6 rounded-full bg-primary/10 grid place-items-center text-xs">
                {c.authorAvatar ?? (c.authorId === user?.id ? user?.avatar : "👤")}
              </div>
              <span className="text-xs font-medium">
                {c.authorName ?? (c.authorId === user?.id ? user?.name : "Someone")}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{c.content}</div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => resolveComment(c.id)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid={`resolve-${c.id}`}
              >
                <Check className="size-3" /> {c.resolved ? "Resolved" : "Resolve"}
              </button>
              <button
                onClick={() => deleteComment(c.id)}
                className="text-xs text-destructive hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="w-full bg-background border border-input rounded px-2 py-1 text-sm min-h-[60px] resize-none"
          data-testid="comment-input"
        />
        <button
          onClick={() => {
            if (text.trim()) {
              addComment({ pageId, content: text });
              setText("");
            }
          }}
          disabled={!text.trim()}
          className="mt-2 w-full bg-primary text-primary-foreground rounded text-xs py-1.5 flex items-center justify-center gap-1 disabled:opacity-50"
          data-testid="post-comment"
        >
          <Send className="size-3" /> Post
        </button>
      </div>
    </div>
  );
}
