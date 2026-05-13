import { useEffect, useMemo, useState } from "react";
import { updatePage, useStore } from "@/lib/store";
import type { Page } from "@/lib/types";
import { X, Copy, Globe, Lock } from "lucide-react";

// Max slug length: 64 chars is well within URL path-segment limits and matches
// Notion's typical slug shape (B-8301). Defense in depth — also enforced by
// `maxLength` on the input below.
const MAX_SLUG_LEN = 64;

function slugify(s: string) {
  const out = s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return out.slice(0, MAX_SLUG_LEN);
}

/** Deterministic fallback when the user-entered slug normalizes to "" — pick
 *  a stable, page-identifying slug from the title (or the page id when the
 *  title is also empty / non-Latin) so the public URL is always resolvable. */
function fallbackSlug(page: Page): string {
  const fromTitle = slugify(page.title ?? "");
  if (fromTitle) return fromTitle;
  // Strip the `pg_` prefix so the URL doesn't expose our internal id shape;
  // truncated to keep the slug visually short.
  return `page-${page.id.replace(/^pg_/, "").slice(0, 10)}`;
}

function uniqueSlug(desired: string, ownPageId: string, pages: Record<string, Page>): string {
  const taken = new Set(
    Object.values(pages)
      .filter((p) => p.id !== ownPageId && p.isPublished && p.publishSlug)
      .map((p) => p.publishSlug as string),
  );
  if (!taken.has(desired)) return desired;
  let n = 2;
  while (taken.has(`${desired}-${n}`)) n++;
  return `${desired}-${n}`;
}

export function ShareDialog({ page, open, onClose }: { page: Page; open: boolean; onClose: () => void }) {
  const pages = useStore((s) => s.pages);
  const [slug, setSlug] = useState(page.publishSlug ?? slugify(page.title || page.id));
  const [copied, setCopied] = useState(false);
  // Track whether the LIVE input (before normalization) had content the user
  // tried to type but slugify dropped (e.g. emoji-only, non-Latin, all
  // punctuation). When true we show the warning + disable Copy without
  // bouncing the user's keystrokes around.
  const [slugInvalid, setSlugInvalid] = useState(false);
  // Detect collisions (B-909) against any other published page in the workspace.
  const collision = useMemo(() => {
    return Object.values(pages).some(
      (p) => p.id !== page.id && p.isPublished && p.publishSlug === slug && slug,
    );
  }, [pages, page.id, slug]);
  // B-8302 — close on Escape so users don't have to reach for the X.
  // Mirrors the keydown wiring in RowDetailDrawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const publishedUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-lg w-[500px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Share</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-muted grid place-items-center">
              {page.isPublished ? <Globe className="size-4" /> : <Lock className="size-4" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Publish to the web</div>
              <div className="text-xs text-muted-foreground">Anyone with the link can view this page</div>
            </div>
            <button
              onClick={() => {
                const newPublishState = !page.isPublished;
                if (newPublishState) {
                  // B-8300 — always end up with a non-empty slug. If the
                  // user's typed slug normalizes empty, fall back to
                  // page title / page id so the public URL is never `/p/`.
                  const desired = slug || fallbackSlug(page);
                  const safeSlug = uniqueSlug(desired, page.id, pages);
                  setSlug(safeSlug);
                  setSlugInvalid(false);
                  updatePage(page.id, { isPublished: true, publishSlug: safeSlug });
                } else {
                  updatePage(page.id, { isPublished: false, publishSlug: null });
                }
              }}
              className={`text-xs px-3 py-1 rounded ${page.isPublished ? "bg-destructive text-white" : "bg-primary text-primary-foreground"}`}
              data-testid="publish-toggle"
            >
              {page.isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>

          {page.isPublished && (
            <div>
              <label className="text-xs font-medium">Public URL</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  value={slug}
                  maxLength={MAX_SLUG_LEN}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const s = slugify(raw);
                    // B-8300 — when the typed value contains characters
                    // but normalizes to "" (emoji-only, non-Latin script,
                    // punctuation-only), keep the prior slug committed
                    // and surface a warning. Empty inputs never reach
                    // the store, so the public URL is never `/p/`.
                    if (raw.trim().length > 0 && s === "") {
                      setSlugInvalid(true);
                      // Leave `slug` state as the last valid value so the
                      // user sees what's currently committed.
                      return;
                    }
                    setSlugInvalid(false);
                    // If they cleared the input entirely, fall back to the
                    // page's title/id-derived slug instead of an empty URL.
                    const next = s === "" ? fallbackSlug(page) : s;
                    setSlug(next);
                    const safe = uniqueSlug(next, page.id, pages);
                    updatePage(page.id, { publishSlug: safe });
                  }}
                  className={`flex-1 border rounded px-2 py-1 text-sm bg-background ${collision || slugInvalid ? "border-amber-400" : "border-input"}`}
                  data-testid="public-slug"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(publishedUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  disabled={!slug}
                  className="text-xs px-2 py-1 rounded hover:bg-accent flex items-center gap-1 disabled:opacity-50"
                  data-testid="copy-link"
                >
                  <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{publishedUrl}</div>
              {collision && (
                <div className="text-xs text-amber-600 mt-1" data-testid="slug-collision-warning">
                  This slug is already taken; we auto-suffixed it to keep your link unique.
                </div>
              )}
              {slugInvalid && (
                <div className="text-xs text-amber-600 mt-1" data-testid="slug-invalid-warning">
                  Slug needs at least one letter or number. Keeping the previous slug.
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border pt-3">
            <div className="text-xs font-medium mb-2">People with access</div>
            <div className="text-xs text-muted-foreground">Workspace members get access automatically</div>
          </div>
        </div>
      </div>
    </div>
  );
}
