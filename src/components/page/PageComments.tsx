import { useMemo, useState } from "react";
import { useStore, addComment, resolveComment, deleteComment, updateComment, setUI } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useParams } from "@tanstack/react-router";
import { X, Send, Check, MessageSquare, Pencil } from "lucide-react";
import type { Comment } from "@/lib/types";

export function PageComments({ pageId, open, onClose }: { pageId: string; open: boolean; onClose: () => void }) {
  const comments = useStore((s) => s.comments);
  const { user } = useAuth();
  const [text, setText] = useState("");
  // Persist the show-resolved toggle in the UI slice so the choice survives
  // reload + cross-tab sync (B-4206).
  const showResolved = useStore((s) => !!s.ui.showResolvedComments);
  const setShowResolved = (v: boolean) => setUI({ showResolvedComments: v });
  // Track which top-level comment we're currently replying to.
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  // Track which comment (top-level OR reply) is being edited.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Top-level page comments + their nested replies. Includes block-scoped
  // comments (Comment.blockId != null) so they're not stuck in the store
  // with no UI surface (B-5010 / B-5102 / B-5304). The block context is
  // rendered as a small chip on each block-scoped comment row.
  const pageComments = useMemo(
    () => Object.values(comments).filter((c) => c.pageId === pageId && !c.parentId && (showResolved || !c.resolved)),
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
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            data-testid="show-resolved-toggle"
          />
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
                  initial={c.content ?? ""}
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
                          initial={r.content ?? ""}
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
                    onKeyDown={(e) => {
                      // Cmd/Ctrl+Enter posts the reply (parity with the
                      // top-level composer, B-4216).
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        if (replyText.trim()) {
                          addComment({ pageId, content: replyText, parentId: c.id });
                          setReplyText("");
                          setReplyTo(null);
                        }
                      }
                      if (e.key === "Escape") setReplyTo(null);
                    }}
                    placeholder="Reply… (Cmd+Enter to post)"
                    className="w-full bg-background border border-input rounded px-2 py-1 text-sm min-h-[44px] resize-none"
                    data-testid={`reply-input-${c.id}`}
                  />
                  <button
                    type="button"
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
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter posts. Plain Enter still inserts a newline so
            // multi-line comments stay easy (B-4216). The Post button is
            // always available as a click fallback.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (text.trim()) {
                addComment({ pageId, content: text });
                setText("");
              }
            }
          }}
          placeholder="Add a comment... (Cmd+Enter to post)"
          className="w-full bg-background border border-input rounded px-2 py-1 text-sm min-h-[60px] resize-none"
          data-testid="comment-input"
        />
        <button
          type="button"
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

function BlockAnchorChip({ commentId, blockId, blockMissing }: { commentId: string; blockId: string; blockMissing: boolean }) {
  // The Comment's block might live on a different page than the page the
  // comment is rendered against (B-6201). Walk up from the block via parentId
  // until we hit a block whose parentId IS a page id — that's the owning
  // page. We navigate to it, then set the hash so PageView's existing
  // hashchange listener does the scroll + ring-highlight.
  const blocks = useStore((s) => s.blocks);
  const pages = useStore((s) => s.pages);
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pageId?: string };
  const ownerPageId = useMemo(() => {
    if (!blockId) return null;
    let cur: { id: string; parentId?: string | null } | undefined = blocks[blockId];
    const seen = new Set<string>();
    while (cur && cur.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (pages[cur.parentId]) return cur.parentId; // parent is a page
      cur = blocks[cur.parentId]; // parent is another block — keep walking
    }
    return null;
  }, [blockId, blocks, pages]);
  return (
    <button
      onClick={() => {
        if (blockMissing || !blockId) return;
        if (ownerPageId && ownerPageId !== params.pageId) {
          // Cross-page jump: navigate first, hash sets the highlight.
          navigate({ to: "/app/p/$pageId", params: { pageId: ownerPageId }, hash: `block-${blockId}` });
        } else {
          window.location.hash = `block-${blockId}`;
        }
      }}
      disabled={blockMissing}
      className={`mb-1 text-[10px] uppercase tracking-wider flex items-center gap-1 ${
        blockMissing
          ? "text-muted-foreground cursor-not-allowed line-through"
          : "text-blue-600 hover:underline"
      }`}
      data-testid={`comment-block-anchor-${commentId}`}
      title={
        blockMissing
          ? "The referenced block no longer exists"
          : ownerPageId && ownerPageId !== params.pageId
            ? `Jump to block on ${pages[ownerPageId]?.title || "another page"}`
            : `Jump to block ${blockId}`
      }
    >
      ↑ on block{blockMissing ? " (missing)" : ownerPageId && ownerPageId !== params.pageId ? " ↗" : ""}
    </button>
  );
}

function CommentEditor({ initial, onSave, onCancel, commentId }: { initial: string; onSave: (next: string) => void; onCancel: () => void; commentId: string }) {
  // Defensive: malformed imports can persist `Comment.content` as
  // undefined / null. Coalesce so .trim() never throws (B-5710 / I-5701).
  const [value, setValue] = useState((initial ?? "") as string);
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
  // Show a small "on block" chip for block-scoped comments so users
  // understand the context (B-5010 / B-5304). Clicking it scrolls the
  // target block into view via the existing #block-<id> hash mechanism.
  const blockId = (comment as { blockId?: string | null }).blockId;
  // Determine whether the block STILL EXISTS in the store. The DOM-only
  // check (`document.querySelector`) was too strict — it false-positived
  // for any block that lived on a different page than the one currently
  // rendered, e.g. when comments are surfaced from a row drawer (B-6104
  // / I-6106). The store check works regardless of which page is open.
  const blocks = useStore((s) => s.blocks);
  const blockMissing = blockId ? !blocks[blockId] : false;
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
      {blockId && (
        <BlockAnchorChip commentId={comment.id} blockId={blockId} blockMissing={blockMissing} />
      )}
      <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
    </div>
  );
}
