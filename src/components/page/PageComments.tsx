import { useMemo, useState } from "react";
import { useStore, addComment, resolveComment, deleteComment, updateComment } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { X, Send, Check, MessageSquare, Pencil } from "lucide-react";
import type { Comment } from "@/lib/types";

export function PageComments({ pageId, open, onClose }: { pageId: string; open: boolean; onClose: () => void }) {
  const comments = useStore((s) => s.comments);
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  // Track which top-level comment we're currently replying to.
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  // Track which comment (top-level OR reply) is being edited.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Top-level page comments + their nested replies.
  const pageComments = useMemo(
    () => Object.values(comments).filter((c) => c.pageId === pageId && !c.blockId && !c.parentId && (showResolved || !c.resolved)),
    [comments, pageId, showResolved],
  );
  const repliesByParent = useMemo(() => {
    const m: Record<string, Comment[]> = {};
    for (const c of Object.values(comments)) {
      if (c.pageId !== pageId || !c.parentId) continue;
      (m[c.parentId] ??= []).push(c);
    }
    for (const list of Object.values(m)) list.sort((a, b) => a.createdAt - b.createdAt);
    return m;
  }, [comments, pageId]);

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
        {pageComments.map((c) => {
          const replies = repliesByParent[c.id] ?? [];
          const isReplying = replyTo === c.id;
          return (
            <div key={c.id} className={`rounded border border-border p-2 ${c.resolved ? "opacity-50" : ""}`} data-testid={`comment-row-${c.id}`}>
              <CommentRow comment={c} user={user} />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => resolveComment(c.id)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  data-testid={`resolve-${c.id}`}
                >
                  <Check className="size-3" /> {c.resolved ? "Resolved" : "Resolve"}
                </button>
                <button
                  onClick={() => setReplyTo(isReplying ? null : c.id)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  data-testid={`reply-${c.id}`}
                >
                  <MessageSquare className="size-3" /> {isReplying ? "Cancel" : `Reply${replies.length ? ` (${replies.length})` : ""}`}
                </button>
                <button
                  onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  data-testid={`comment-edit-${c.id}`}
                >
                  <Pencil className="size-3" /> {editingId === c.id ? "Cancel" : "Edit"}
                </button>
                <button
                  onClick={() => deleteComment(c.id)}
                  className="text-xs text-destructive hover:underline"
                  data-testid={`comment-delete-${c.id}`}
                >
                  Delete
                </button>
              </div>
              {editingId === c.id && (
                <CommentEditor
                  initial={c.content}
                  onSave={(next) => { updateComment(c.id, next); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                  commentId={c.id}
                />
              )}
              {replies.length > 0 && (
                <div className="mt-2 pl-3 border-l border-border space-y-2">
                  {replies.map((r) => (
                    <div key={r.id} className="text-sm" data-testid={`reply-row-${r.id}`}>
                      <CommentRow comment={r} user={user} />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                          data-testid={`comment-edit-${r.id}`}
                        >
                          {editingId === r.id ? "Cancel" : "Edit"}
                        </button>
                        <button
                          onClick={() => deleteComment(r.id)}
                          className="text-xs text-destructive hover:underline"
                          data-testid={`comment-delete-${r.id}`}
                        >
                          Delete
                        </button>
                      </div>
                      {editingId === r.id && (
                        <CommentEditor
                          initial={r.content}
                          onSave={(next) => { updateComment(r.id, next); setEditingId(null); }}
                          onCancel={() => setEditingId(null)}
                          commentId={r.id}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isReplying && (
                <div className="mt-2 pl-3 border-l border-border">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Reply…"
                    className="w-full bg-background border border-input rounded px-2 py-1 text-sm min-h-[44px] resize-none"
                    data-testid={`reply-input-${c.id}`}
                  />
                  <button
                    onClick={() => {
                      if (!replyText.trim()) return;
                      addComment({ pageId, content: replyText, parentId: c.id });
                      setReplyText("");
                      setReplyTo(null);
                    }}
                    disabled={!replyText.trim()}
                    className="mt-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 disabled:opacity-50"
                    data-testid={`reply-submit-${c.id}`}
                  >
                    Post reply
                  </button>
                </div>
              )}
            </div>
          );
        })}
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

function CommentEditor({ initial, onSave, onCancel, commentId }: { initial: string; onSave: (next: string) => void; onCancel: () => void; commentId: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="mt-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm min-h-[44px] resize-none"
        data-testid={`comment-edit-input-${commentId}`}
      />
      <div className="flex gap-1 mt-1">
        <button
          onClick={() => {
            const next = value.trim();
            if (next) onSave(next);
          }}
          disabled={!value.trim() || value.trim() === initial.trim()}
          className="text-xs bg-primary text-primary-foreground rounded px-2 py-1 disabled:opacity-50"
          data-testid={`comment-edit-save-${commentId}`}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground px-2"
          data-testid={`comment-edit-cancel-${commentId}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CommentRow({ comment, user }: { comment: Comment; user: ReturnType<typeof useAuth>["user"] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-6 rounded-full bg-primary/10 grid place-items-center text-xs">
          {comment.authorAvatar ?? (comment.authorId === user?.id ? user?.avatar : "👤")}
        </div>
        <span className="text-xs font-medium">
          {comment.authorName ?? (comment.authorId === user?.id ? user?.name : "Someone")}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(comment.createdAt).toLocaleString()}
          {(comment as { editedAt?: number }).editedAt && (
            <span className="ml-1 italic" title={`Edited ${new Date((comment as { editedAt?: number }).editedAt!).toLocaleString()}`}>(edited)</span>
          )}
        </span>
      </div>
      <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
    </div>
  );
}
