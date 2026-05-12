import { useState, useEffect, useRef } from "react";
import type { NotionDatabase, Property, DatabaseRow, SelectOption } from "@/lib/types";
import { useStore, updateRow, updateDatabaseProperty } from "@/lib/store";
import { uid } from "@/lib/id";
import { evaluateFormula } from "@/lib/formula";
import { toast } from "@/components/ui/Toast";

const COLORS: SelectOption["color"][] = [
  "default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red",
];

const COLOR_CLASS: Record<string, string> = {
  default: "bg-muted text-foreground",
  gray: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  brown: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  orange: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  yellow: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200",
  green: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200",
  blue: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
  purple: "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200",
  pink: "bg-pink-100 text-pink-900 dark:bg-pink-900/40 dark:text-pink-200",
  red: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

export function PropertyCell({
  database,
  property,
  row,
  className,
}: {
  database: NotionDatabase;
  property: Property;
  row: DatabaseRow;
  className?: string;
}) {
  const v = row.values[property.id];
  if (property.type === "title") {
    return <TitleCell row={row} value={(v as string) ?? ""} property={property} className={className} />;
  }
  if (property.type === "text") {
    return <TextCell row={row} value={(v as string) ?? ""} property={property} className={className} />;
  }
  if (property.type === "number") {
    return <NumberCell row={row} value={v as number | undefined} property={property} className={className} />;
  }
  if (property.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={!!v}
        onChange={(e) => updateRow(row.id, { values: { [property.id]: e.target.checked } })}
        data-testid={`cell-checkbox-${row.id}-${property.id}`}
      />
    );
  }
  if (property.type === "select" || property.type === "multi-select" || property.type === "status") {
    return <SelectCell row={row} value={v} property={property} database={database} className={className} />;
  }
  if (property.type === "date") {
    return <DateCell row={row} value={v as string | undefined} property={property} className={className} />;
  }
  if (property.type === "url") {
    return <URLCell row={row} value={(v as string) ?? ""} property={property} className={className} />;
  }
  if (property.type === "email") {
    return <EmailCell row={row} value={(v as string) ?? ""} property={property} className={className} />;
  }
  if (property.type === "phone") {
    return <PhoneCell row={row} value={(v as string) ?? ""} property={property} className={className} />;
  }
  if (property.type === "files") {
    return <FilesCell row={row} value={(v as string[]) ?? []} property={property} />;
  }
  if (property.type === "person") {
    return <PersonCell row={row} value={(v as string[]) ?? []} property={property} />;
  }
  if (property.type === "created-time") {
    return <span className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>;
  }
  if (property.type === "last-edited-time") {
    return <span className="text-xs text-muted-foreground">{new Date(row.updatedAt).toLocaleString()}</span>;
  }
  if (property.type === "created-by") {
    return <span className="text-xs">{row.createdBy.slice(-6)}</span>;
  }
  if (property.type === "last-edited-by") {
    return <span className="text-xs">{row.lastEditedBy.slice(-6)}</span>;
  }
  if (property.type === "unique-id") {
    return <UniqueIdCell row={row} property={property} database={database} />;
  }
  if (property.type === "formula") {
    return <FormulaCell row={row} property={property} database={database} />;
  }
  if (property.type === "rollup") {
    return <RollupCell row={row} property={property} database={database} />;
  }
  if (property.type === "relation") {
    return <RelationCell row={row} value={(v as string[]) ?? []} property={property} />;
  }
  if (property.type === "verification") {
    return <VerificationCell row={row} value={v as { verified?: boolean } | undefined} property={property} />;
  }
  if (property.type === "button") {
    return <ButtonCell row={row} property={property} database={database} />;
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function TitleCell({ row, value, property, className }: { row: DatabaseRow; value: string; property: Property; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => updateRow(row.id, { values: { [property.id]: v } })}
      className={`bg-transparent outline-none font-medium w-full ${className ?? ""}`}
      placeholder="Untitled"
      data-testid={`cell-title-${row.id}-${property.id}`}
    />
  );
}

function TextCell({ row, value, property, className }: { row: DatabaseRow; value: string; property: Property; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => updateRow(row.id, { values: { [property.id]: v } })}
      className={`bg-transparent outline-none w-full ${className ?? ""}`}
      data-testid={`cell-text-${row.id}-${property.id}`}
    />
  );
}

function NumberCell({ row, value, property, className }: { row: DatabaseRow; value: number | undefined; property: Property; className?: string }) {
  const [v, setV] = useState(value?.toString() ?? "");
  useEffect(() => setV(value?.toString() ?? ""), [value]);
  function format(n: number) {
    const fmt = (property as { format?: string }).format ?? "number";
    if (fmt === "percent") return `${n}%`;
    if (fmt === "dollar") return `$${n}`;
    if (fmt === "euro") return `€${n}`;
    if (fmt === "pound") return `£${n}`;
    if (fmt === "yen") return `¥${n}`;
    if (fmt === "number-with-commas") return n.toLocaleString();
    return n.toString();
  }
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = parseFloat(v);
        updateRow(row.id, { values: { [property.id]: isNaN(n) ? null : n } });
      }}
      placeholder="0"
      className={`bg-transparent outline-none w-full text-right ${className ?? ""}`}
      data-testid={`cell-number-${row.id}-${property.id}`}
    />
  );
}

function SelectCell({ row, value, property, database, className }: { row: DatabaseRow; value: unknown; property: Property; database: NotionDatabase; className?: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const isMulti = property.type === "multi-select";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [open]);

  const options = (property as { options?: SelectOption[] }).options ?? [];
  const selectedIds = Array.isArray(value) ? value as string[] : (value ? [value as string] : []);
  const selected = selectedIds.map((id) => options.find((o) => o.id === id)).filter(Boolean) as SelectOption[];

  function toggleOption(opt: SelectOption) {
    if (isMulti) {
      const next = selectedIds.includes(opt.id) ? selectedIds.filter((s) => s !== opt.id) : [...selectedIds, opt.id];
      updateRow(row.id, { values: { [property.id]: next } });
    } else {
      updateRow(row.id, { values: { [property.id]: opt.id } });
      setOpen(false);
    }
  }

  function clear() {
    updateRow(row.id, { values: { [property.id]: isMulti ? [] : null } });
  }

  function createOption() {
    const name = search.trim();
    if (!name) return;
    const id = uid("opt");
    const color = COLORS[(options.length) % COLORS.length] as SelectOption["color"];
    const newOpt: SelectOption = { id, name, color };
    updateDatabaseProperty(database.id, property.id, { options: [...options, newOpt] } as Partial<Property>);
    setSearch("");
    if (isMulti) {
      updateRow(row.id, { values: { [property.id]: [...selectedIds, id] } });
    } else {
      updateRow(row.id, { values: { [property.id]: id } });
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-left w-full flex flex-wrap gap-1 min-h-[24px] ${className ?? ""}`}
        data-testid={`cell-select-${row.id}-${property.id}`}
      >
        {selected.length === 0 && <span className="text-xs text-muted-foreground">Empty</span>}
        {selected.map((opt) => (
          <span key={opt.id} className={`text-xs rounded px-1.5 py-0.5 ${COLOR_CLASS[opt.color] ?? COLOR_CLASS.default}`}>
            {opt.name}
          </span>
        ))}
      </button>
      {open && (
        <div className="absolute z-30 bg-popover border border-border rounded shadow-lg w-56 p-2 mt-1 max-h-72 overflow-y-auto">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !options.find((o) => o.name === search.trim())) {
                createOption();
              }
            }}
            placeholder="Search or create…"
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            data-testid={`select-search-${row.id}-${property.id}`}
          />
          <div className="mt-2 space-y-0.5">
            {options
              .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => toggleOption(o)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1 text-xs hover:bg-accent rounded ${selectedIds.includes(o.id) ? "bg-accent" : ""}`}
                  data-testid={`select-option-${o.id}`}
                >
                  <span className={`px-1.5 py-0.5 rounded ${COLOR_CLASS[o.color] ?? COLOR_CLASS.default}`}>{o.name}</span>
                </button>
              ))}
            {search.trim() && !options.find((o) => o.name === search.trim()) && (
              <button
                onClick={createOption}
                className="w-full text-left px-2 py-1 text-xs hover:bg-accent rounded text-muted-foreground"
                data-testid={`select-create`}
              >
                + Create "{search}"
              </button>
            )}
            {selected.length > 0 && (
              <button onClick={clear} className="w-full text-left px-2 py-1 text-xs hover:bg-accent rounded text-destructive">
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DateCell({ row, value, property, className }: { row: DatabaseRow; value: string | undefined; property: Property; className?: string }) {
  return (
    <input
      type={(property as { includeTime?: boolean }).includeTime ? "datetime-local" : "date"}
      value={value ?? ""}
      onChange={(e) => updateRow(row.id, { values: { [property.id]: e.target.value || null } })}
      className={`bg-transparent outline-none w-full text-xs ${className ?? ""}`}
      data-testid={`cell-date-${row.id}-${property.id}`}
    />
  );
}

function URLCell({ row, value, property, className }: { row: DatabaseRow; value: string; property: Property; className?: string }) {
  return (
    <input
      type="url"
      value={value}
      onChange={(e) => updateRow(row.id, { values: { [property.id]: e.target.value } })}
      className={`bg-transparent outline-none underline w-full text-blue-600 ${className ?? ""}`}
      placeholder="https://…"
      data-testid={`cell-url-${row.id}-${property.id}`}
    />
  );
}

function EmailCell({ row, value, property, className }: { row: DatabaseRow; value: string; property: Property; className?: string }) {
  return (
    <input
      type="email"
      value={value}
      onChange={(e) => updateRow(row.id, { values: { [property.id]: e.target.value } })}
      className={`bg-transparent outline-none w-full ${className ?? ""}`}
      placeholder="email@…"
      data-testid={`cell-email-${row.id}-${property.id}`}
    />
  );
}

function PhoneCell({ row, value, property, className }: { row: DatabaseRow; value: string; property: Property; className?: string }) {
  return (
    <input
      type="tel"
      value={value}
      onChange={(e) => updateRow(row.id, { values: { [property.id]: e.target.value } })}
      className={`bg-transparent outline-none w-full ${className ?? ""}`}
      placeholder="+33…"
      data-testid={`cell-phone-${row.id}-${property.id}`}
    />
  );
}

function FilesCell({ row, value, property }: { row: DatabaseRow; value: string[]; property: Property }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {value.length === 0 && <span className="text-xs text-muted-foreground">Empty</span>}
      {value.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs underline truncate max-w-[100px]">
          📎 {i + 1}
        </a>
      ))}
      <label className="text-xs text-muted-foreground cursor-pointer">
        +
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const result = ev.target?.result as string;
              updateRow(row.id, { values: { [property.id]: [...value, result] } });
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>
    </div>
  );
}

function PersonCell({ row, value, property }: { row: DatabaseRow; value: string[]; property: Property }) {
  const user = useStore((s) => s.currentUser);
  return (
    <button
      onClick={() => {
        if (user) {
          const next = value.includes(user.id) ? value.filter((v) => v !== user.id) : [...value, user.id];
          updateRow(row.id, { values: { [property.id]: next } });
        }
      }}
      className="text-xs"
      data-testid={`cell-person-${row.id}-${property.id}`}
    >
      {value.length === 0 ? <span className="text-muted-foreground">Empty</span> : (
        <div className="flex gap-1">
          {value.map((id) => (
            <span key={id} className="size-5 rounded-full bg-primary/10 grid place-items-center text-xs">
              {id === user?.id ? user.avatar : "👤"}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function UniqueIdCell({ row, property, database }: { row: DatabaseRow; property: Property; database: NotionDatabase }) {
  const prefix = (property as { prefix?: string }).prefix ?? "";
  // Prefer the stable per-row uniqueIdSeq; fallback to a positional index for
  // rows created before the schema migration so old rows stay readable.
  const seq = row.uniqueIdSeq ?? (database.rows.indexOf(row.id) + 1);
  return <span className="text-xs font-mono text-muted-foreground">{prefix}{prefix ? "-" : ""}{seq}</span>;
}

function FormulaCell({ row, property, database }: { row: DatabaseRow; property: Property; database: NotionDatabase }) {
  const expr = (property as { expression?: string }).expression ?? "";
  const result = evaluateFormula(expr, row, database);
  return <span className="text-xs font-mono">{String(result ?? "")}</span>;
}

function RollupCell({ row, property, database }: { row: DatabaseRow; property: Property; database: NotionDatabase }) {
  const rp = property as Extract<Property, { type: "rollup" }>;
  const allRows = useStore((s) => s.rows);
  const relProp = database.properties.find((p) => p.id === rp.relationPropertyId);
  if (!relProp || relProp.type !== "relation") {
    return (
      <span className="text-xs text-muted-foreground italic" title="Open the property menu to pick a Relation to roll up.">
        configure rollup
      </span>
    );
  }
  const fn = rp.function ?? "count";
  const linkedIds = (row.values[rp.relationPropertyId] as string[]) ?? [];
  const linked = linkedIds.map((id) => allRows[id]).filter(Boolean) as DatabaseRow[];
  if (fn === "count") return <span className="text-xs">{linked.length}</span>;
  if (!rp.targetPropertyId) {
    // Function chosen but no target prop yet — count linked rows as a sane fallback.
    return <span className="text-xs">{linked.length}</span>;
  }
  const values = linked.map((r) => r.values[rp.targetPropertyId]).filter((v) => v !== undefined && v !== null);
  let result: unknown = "";
  if (fn === "count-values") result = values.length;
  else if (fn === "sum") result = values.reduce<number>((a, b) => a + Number(b), 0);
  else if (fn === "average") result = values.length ? values.reduce<number>((a, b) => a + Number(b), 0) / values.length : 0;
  else if (fn === "min") result = values.length ? Math.min(...values.map(Number)) : "";
  else if (fn === "max") result = values.length ? Math.max(...values.map(Number)) : "";
  else if (fn === "show-original") result = values.join(", ");
  else if (fn === "earliest") result = values.length ? new Date(Math.min(...values.map((v) => Date.parse(String(v))))).toISOString().slice(0, 10) : "";
  else if (fn === "latest") result = values.length ? new Date(Math.max(...values.map((v) => Date.parse(String(v))))).toISOString().slice(0, 10) : "";
  return <span className="text-xs">{String(result)}</span>;
}

function RelationCell({ row, value, property }: { row: DatabaseRow; value: string[]; property: Property }) {
  const databases = useStore((s) => s.databases);
  const rp = property as Extract<Property, { type: "relation" }>;
  const targetDb = databases[rp.targetDatabaseId];
  const allRows = useStore((s) => s.rows);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [open]);

  if (!targetDb) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Choose a target database in the property menu
      </span>
    );
  }

  const titleProp = targetDb.properties.find((p) => p.type === "title");
  const linkedIds = value ?? [];
  const linked = linkedIds.map((id) => allRows[id]).filter(Boolean);

  function toggle(targetRowId: string) {
    const next = linkedIds.includes(targetRowId)
      ? linkedIds.filter((id) => id !== targetRowId)
      : [...linkedIds, targetRowId];
    updateRow(row.id, { values: { [property.id]: next } });
    // Mirror on paired side for dual relations.
    if (rp.isDual && rp.pairedPropertyId) {
      const other = allRows[targetRowId];
      if (other) {
        const otherLinks = (other.values[rp.pairedPropertyId] as string[]) ?? [];
        const wasLinked = otherLinks.includes(row.id);
        const isNowLinked = next.includes(targetRowId);
        let nextOther: string[] | null = null;
        if (wasLinked && !isNowLinked) nextOther = otherLinks.filter((id) => id !== row.id);
        else if (!wasLinked && isNowLinked) nextOther = [...otherLinks, row.id];
        if (nextOther) updateRow(targetRowId, { values: { [rp.pairedPropertyId]: nextOther } });
      }
    }
  }

  function rowLabel(r: DatabaseRow): string {
    if (titleProp) return ((r.values[titleProp.id] as string) || "").trim() || "Untitled";
    return "Item";
  }

  const filteredRows = targetDb.rows
    .map((id) => allRows[id])
    .filter((r): r is DatabaseRow => !!r && !r.isInTrash)
    .filter((r) => !search || rowLabel(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-left w-full flex flex-wrap gap-1 min-h-[24px]"
        data-testid={`cell-relation-${row.id}-${property.id}`}
      >
        {linked.length === 0 && <span className="text-xs text-muted-foreground">Empty</span>}
        {linked.map((r) => (
          <span key={r.id} className="text-xs px-1.5 py-0.5 bg-muted rounded">
            {rowLabel(r)}
          </span>
        ))}
      </button>
      {open && (
        <div className="absolute z-30 bg-popover border border-border rounded shadow-lg w-56 p-2 mt-1 max-h-72 overflow-y-auto">
          <div className="text-[10px] uppercase text-muted-foreground mb-1 px-1">
            Link to → {targetDb.name}
          </div>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rows…"
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            data-testid={`relation-search-${row.id}-${property.id}`}
          />
          <div className="mt-2 space-y-0.5">
            {filteredRows.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-1">No rows in target database</div>
            )}
            {filteredRows.map((r) => (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1 text-xs hover:bg-accent rounded ${linkedIds.includes(r.id) ? "bg-accent" : ""}`}
                data-testid={`relation-row-${r.id}`}
              >
                <input
                  type="checkbox"
                  checked={linkedIds.includes(r.id)}
                  readOnly
                  className="pointer-events-none"
                />
                <span className="truncate flex-1">{rowLabel(r)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationCell({ row, value, property }: { row: DatabaseRow; value: { verified?: boolean } | undefined; property: Property }) {
  return (
    <button
      onClick={() => updateRow(row.id, { values: { [property.id]: { verified: !value?.verified } } })}
      className={`text-xs px-1.5 py-0.5 rounded ${value?.verified ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}
    >
      {value?.verified ? "✔ Verified" : "Unverified"}
    </button>
  );
}

function ButtonCell({ row, property, database }: { row: DatabaseRow; property: Property; database: NotionDatabase }) {
  const bp = property as Extract<Property, { type: "button" }>;
  return (
    <button
      onClick={() => {
        for (const action of bp.actions ?? []) {
          if (action.kind === "edit-property") {
            updateRow(row.id, { values: { [action.propertyId]: action.value } });
          } else if (action.kind === "show-confirmation") {
            toast(action.message, "info");
          } else if (action.kind === "send-webhook") {
            fetch(action.url, { method: "POST", body: action.payload ?? "{}" }).catch(() => undefined);
            toast(`Sent webhook to ${action.url}`, "info");
          }
        }
        if (!bp.actions || bp.actions.length === 0) {
          toast(`Ran "${bp.label || "Button"}" — configure actions in property settings.`, "info");
        }
      }}
      className="text-xs bg-primary text-primary-foreground rounded px-2 py-1"
      data-testid={`cell-button-${row.id}-${property.id}`}
    >
      {bp.label || "Run"}
    </button>
  );
}
