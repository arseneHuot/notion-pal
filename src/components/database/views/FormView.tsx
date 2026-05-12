import { useState } from "react";
import { useStore, addDatabaseRow, updateView } from "@/lib/store";
import { PropertyCell } from "../PropertyEditor";
import { Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export function FormView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const view = db?.views.find((v) => v.id === viewId);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  // Default to the user-facing Preview (B-1901). Users can flip to Edit
  // mode via the button to configure the form's title / description.
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!db || !view || view.type !== "form") return null;
  const fields = db.properties.filter((p) => p.type !== "created-time" && p.type !== "created-by" && p.type !== "last-edited-time" && p.type !== "last-edited-by" && p.type !== "unique-id" && p.type !== "formula" && p.type !== "rollup" && p.type !== "button");

  // Compute which property ids are hidden by the form's conditional rules
  // (B-2003). A property is hidden when at least one rule that *would*
  // show it doesn't match the current answers (existing schema:
  // ConditionalRule.showPropertyIds + operator-based predicate).
  const conditionalRules = view.conditionalLogic ?? [];
  const hiddenByRules = new Set<string>();
  if (conditionalRules.length > 0) {
    // Start with: properties that are referenced as a "show target" by any
    // rule are hidden by default; they become visible only if a rule matches.
    const referenced = new Set<string>();
    for (const rule of conditionalRules) for (const pid of rule.showPropertyIds) referenced.add(pid);
    for (const pid of referenced) hiddenByRules.add(pid);
    for (const rule of conditionalRules) {
      const v = values[rule.ifPropertyId];
      let pass = false;
      if (rule.operator === "equals") pass = Array.isArray(v) ? v.includes(rule.value as never) : v === rule.value;
      else if (rule.operator === "not-equals") pass = Array.isArray(v) ? !v.includes(rule.value as never) : v !== rule.value;
      else if (rule.operator === "is-empty") pass = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      else if (rule.operator === "is-not-empty") pass = !(v == null || v === "" || (Array.isArray(v) && v.length === 0));
      if (pass) for (const pid of rule.showPropertyIds) hiddenByRules.delete(pid);
    }
  }
  const visibleFields = fields.filter((p) => !hiddenByRules.has(p.id));

  function submit() {
    const rowId = addDatabaseRow(databaseId, values);
    setSubmitted(true);
    setValues({});
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="border border-border rounded p-4 bg-card max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setEditing(!editing)} className="text-xs text-muted-foreground hover:text-foreground">
          {editing ? "Preview" : "Edit"}
        </button>
        <button
          onClick={() => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${databaseId}/${viewId}`;
            navigator.clipboard?.writeText(url).catch(() => undefined);
            setCopied(true);
            toast("Form link copied to clipboard", "info");
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-accent"
          data-testid={`form-copylink-${viewId}`}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? "Copied" : "Copy form link"}
        </button>
      </div>
      {editing ? (
        <div className="space-y-3">
          <input
            value={view.title}
            onChange={(e) => updateView(databaseId, viewId, { title: e.target.value } as Partial<typeof view>)}
            placeholder="Form title"
            className="text-2xl font-bold bg-transparent outline-none w-full"
            data-testid={`form-title-${viewId}`}
          />
          <textarea
            value={view.description}
            onChange={(e) => updateView(databaseId, viewId, { description: e.target.value } as Partial<typeof view>)}
            placeholder="Description (optional)"
            className="text-sm text-muted-foreground bg-transparent outline-none w-full resize-none"
          />
          <div className="text-xs text-muted-foreground mb-2">Form will include each database property:</div>
          {fields.map((p) => (
            <div key={p.id} className="text-sm">
              <label className="block text-xs font-medium mb-1">{p.name}</label>
              <div className="border border-border rounded px-2 py-1.5 bg-background text-muted-foreground italic">
                {p.type} field
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">{view.title || db.name}</h2>
          {view.description && <p className="text-sm text-muted-foreground">{view.description}</p>}
          {submitted ? (
            <div className="text-green-700 dark:text-green-300 text-sm p-3 bg-green-100 dark:bg-green-900/40 rounded">
              {view.submitMessage || "Thanks for submitting!"}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleFields.map((p) => (
                <div key={p.id} data-testid={`form-field-${p.id}`}>
                  <label className="block text-xs font-medium mb-1">{p.name}</label>
                  <FormField
                    database={db}
                    property={p}
                    value={values[p.id]}
                    onChange={(v) => setValues((cur) => ({ ...cur, [p.id]: v }))}
                  />
                </div>
              ))}
              <button
                onClick={submit}
                className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
                data-testid={`form-submit-${viewId}`}
              >
                Submit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ database, property, value, onChange }: { database: ReturnType<typeof useStore<unknown>>; property: { id: string; type: string; name: string; options?: { id: string; name: string }[] }; value: unknown; onChange: (v: unknown) => void }) {
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
    return (
      <select
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-input rounded px-2 py-1 text-sm"
      >
        <option value="">Choose…</option>
        {(property.options ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    );
  }
  if (property.type === "multi-select") {
    // Render chip-style toggles; store the value as an array (B-1406).
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1">
        {(property.options ?? []).map((o) => {
          const active = selected.includes(o.id);
          return (
            <button
              type="button"
              key={o.id}
              onClick={() => {
                const next = active ? selected.filter((id) => id !== o.id) : [...selected, o.id];
                onChange(next);
              }}
              className={`text-xs rounded px-2 py-1 border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"}`}
              data-testid={`form-multiselect-${property.id}-${o.id}`}
            >
              {o.name}
            </button>
          );
        })}
        {(property.options ?? []).length === 0 && (
          <div className="text-xs text-muted-foreground italic">No options yet</div>
        )}
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
