import { useState } from "react";
import { updatePage } from "@/lib/store";
import type { Page } from "@/lib/types";
import { X, Copy, Globe, Lock } from "lucide-react";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function ShareDialog({ page, open, onClose }: { page: Page; open: boolean; onClose: () => void }) {
  const [slug, setSlug] = useState(page.publishSlug ?? slugify(page.title || page.id));
  const [copied, setCopied] = useState(false);
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
                updatePage(page.id, { isPublished: newPublishState, publishSlug: newPublishState ? slug : null });
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
                  onChange={(e) => {
                    const s = slugify(e.target.value);
                    setSlug(s);
                    updatePage(page.id, { publishSlug: s });
                  }}
                  className="flex-1 border border-input rounded px-2 py-1 text-sm bg-background"
                  data-testid="public-slug"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(publishedUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="text-xs px-2 py-1 rounded hover:bg-accent flex items-center gap-1"
                  data-testid="copy-link"
                >
                  <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{publishedUrl}</div>
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
