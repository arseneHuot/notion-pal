import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { NotionDatabase, Property, View } from "@/lib/types";

/**
 * Public form submission page. Walks every per-user localStorage bucket to
 * find the matching database + form view, then renders the form fields and
 * appends a row to the host workspace's localStorage on submit.
 */
export const Route = createFileRoute("/form/$dbId/$viewId")({
  component: PublicFormPage,
});

interface Found {
  storageKey: string;
  db: NotionDatabase;
  view: Extract<View, { type: "form" }>;
}

function findForm(dbId: string, viewId: string): Found | null {
  if (typeof localStorage === "undefined") return null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("notion-clone:user:")) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const state = JSON.parse(raw);
      const db = state.databases?.[dbId];
      if (!db || db.isInTrash) continue;
      const view = (db.views ?? []).find((v: View) => v.id === viewId && v.type === "form");
      if (view) {
        return { storageKey: key, db, view };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function PublicFormPage() {
  const { dbId, viewId } = Route.useParams();
  const [data, setData] = useState<Found | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(findForm(dbId, viewId));
    setLoading(false);
  }, [dbId, viewId]);

  const fields = useMemo<Property[]>(() => {
    if (!data) return [];
    return data.db.properties.filter(
      (p) => p.type !== "created-time" && p.type !== "created-by" && p.type !== "last-edited-time" && p.type !== "last-edited-by" && p.type !== "unique-id" && p.type !== "formula" && p.type !== "rollup" && p.type !== "button",
    );
  }, [data]);

  // Apply conditional logic to hide fields based on current answers.
  const visibleFields = useMemo(() => {
    if (!data) return fields;
    const rules = data.view.conditionalLogic ?? [];
    if (rules.length === 0) return fields;
    const hidden = new Set<string>();
    for (const r of rules) for (const pid of r.showPropertyIds) hidden.add(pid);
    for (const rule of rules) {
      const v = values[rule.ifPropertyId];
      let pass = false;
      if (rule.operator === "equals") pass = Array.isArray(v) ? v.includes(rule.value as never) : v === rule.value;
      else if (rule.operator === "not-equals") pass = Array.isArray(v) ? !v.includes(rule.value as never) : v !== rule.value;
      else if (rule.operator === "is-empty") pass = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      else if (rule.operator === "is-not-empty") pass = !(v == null || v === "" || (Array.isArray(v) && v.length === 0));
      if (pass) for (const pid of rule.showPropertyIds) hidden.delete(pid);
    }
    return fields.filter((p) => !hidden.has(p.id));
  }, [data, fields, values]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading form…</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Form not found</h1>
          <p className="text-sm text-muted-foreground">This form may have been removed or the link is wrong.</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 underline">Go home</Link>
        </div>
      </div>
    );
  }

  const { db, view } = data;

  function submit() {
    if (!data) return;
    // Persist the row directly to the host user's storage bucket.
    try {
      const raw = localStorage.getItem(data.storageKey);
      if (!raw) {
        setError("Storage unavailable");
        return;
      }
      const state = JSON.parse(raw);
      const id = "row_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const now = Date.now();
      const titleProp = data.db.properties.find((p) => p.type === "title");
      const v = { ...values };
      if (titleProp && !(titleProp.id in v)) v[titleProp.id] = "";
      const row = {
        id,
        databaseId: dbId,
        values: v,
        blocks: [],
        uniqueIdSeq: state.databases[dbId]?.nextUniqueId ?? (state.databases[dbId]?.rows?.length ?? 0) + 1,
        icon: null,
        cover: null,
        createdAt: now,
        updatedAt: now,
        createdBy: "public-form",
        lastEditedBy: "public-form",
        isInTrash: false,
      };
      state.rows[id] = row;
      state.databases[dbId].rows = [...(state.databases[dbId].rows ?? []), id];
      state.databases[dbId].nextUniqueId = (state.databases[dbId].nextUniqueId ?? 1) + 1;
      localStorage.setItem(data.storageKey, JSON.stringify(state));
      setSubmitted(true);
      setValues({});
      setTimeout(() => setSubmitted(false), 5000);
    } catch (e) {
      setError("Failed to submit");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-3 flex items-center gap-2">
        <span className="size-7 rounded bg-primary text-primary-foreground grid place-items-center font-bold">N</span>
        <span className="font-semibold text-sm">NotionClone</span>
        <Link to="/" className="ml-auto text-xs text-muted-foreground hover:text-foreground">Create your own →</Link>
      </header>
      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2" data-testid="public-form-title">{view.title || db.name}</h1>
        {view.description && <p className="text-sm text-muted-foreground mb-6">{view.description}</p>}

        {submitted ? (
          <div className="rounded-md bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 p-4 text-green-900 dark:text-green-200" data-testid="public-form-thanks">
            {view.submitMessage || "Thanks for submitting!"}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleFields.map((p) => (
              <div key={p.id} data-testid={`public-form-field-${p.id}`}>
                <label className="block text-xs font-medium mb-1">{p.name}</label>
                <PublicFormField property={p} value={values[p.id]} onChange={(v) => setValues((cur) => ({ ...cur, [p.id]: v }))} />
              </div>
            ))}
            <button
              onClick={submit}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
              data-testid="public-form-submit"
            >
              Submit
            </button>
            {error && <div className="text-xs text-destructive mt-2">{error}</div>}
          </div>
        )}
      </main>
    </div>
  );
}

function PublicFormField({ property, value, onChange }: { property: Property; value: unknown; onChange: (v: unknown) => void }) {
  if (property.type === "text" || property.type === "title") {
    return (
      <input
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
      />
    );
  }
  if (property.type === "number") {
    return (
      <input
        type="number"
        value={(value as number) ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
      />
    );
  }
  if (property.type === "date") {
    return (
      <input
        type="date"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
      />
    );
  }
  if (property.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  if (property.type === "select" || property.type === "status") {
    const opts = (property as Extract<Property, { type: "select" }>).options ?? [];
    return (
      <select
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
      >
        <option value="">Choose…</option>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    );
  }
  if (property.type === "multi-select") {
    const opts = (property as Extract<Property, { type: "multi-select" }>).options ?? [];
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1">
        {opts.map((o) => {
          const active = selected.includes(o.id);
          return (
            <button
              type="button"
              key={o.id}
              onClick={() => onChange(active ? selected.filter((id) => id !== o.id) : [...selected, o.id])}
              className={`text-xs rounded px-2 py-1 border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"}`}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    );
  }
  if (property.type === "url" || property.type === "email" || property.type === "phone") {
    return (
      <input
        type={property.type === "email" ? "email" : property.type === "phone" ? "tel" : "url"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
      />
    );
  }
  return (
    <input
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
    />
  );
}
