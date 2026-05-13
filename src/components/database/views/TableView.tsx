import { useEffect, useRef, useState } from "react";
import { useStore, addDatabaseRow, deleteRow, removeDatabaseProperty, updateDatabaseProperty, addDatabaseProperty, updateView, reorderDatabaseRows, getState as getStoreState } from "@/lib/store";

function databasesNow() {
  return Object.values(getStoreState().databases);
}
import { PropertyCell } from "../PropertyEditor";
import { applyFilters, applySorts } from "../filter";
import { ChevronDown, MoreHorizontal, Plus, Trash } from "lucide-react";
import type { Property, PropertyType } from "@/lib/types";

const PROPERTY_TYPES: PropertyType[] = [
  "text", "number", "select", "multi-select", "status", "date", "person", "files",
  "checkbox", "url", "email", "phone", "formula", "relation", "rollup",
  "created-time", "created-by", "last-edited-time", "last-edited-by",
  "unique-id", "verification", "button",
];

export function TableView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const rowsMap = useStore((s) => s.rows);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view || view.type !== "table") return null;

  const rows = db.rows.map((r) => rowsMap[r]).filter((r) => r && !r.isInTrash);
  const filtered = applyFilters(rows, view.filters ?? [], db);
  const sorted = applySorts(filtered, view.sorts ?? [], db);
  const visibleProps = db.properties.filter((p) => !(view.hiddenProperties ?? []).includes(p.id));

  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="border-collapse w-full text-sm">
        <thead>
          <tr className="bg-muted/40">
            {visibleProps.map((p, idx) => (
              <PropertyHeader key={p.id} property={p} databaseId={databaseId} viewId={viewId} sticky={idx === 0 && p.type === "title"} />
            ))}
            <th className="w-8"></th>
            <th className="w-8 border-b border-border">
              <PropertyHeaderAdd databaseId={databaseId} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-muted/20 group"
              draggable
              data-row-id={row.id}
              data-testid={`row-${row.id}`}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-row-id", row.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("application/x-row-id")) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                const sourceId = e.dataTransfer.getData("application/x-row-id");
                if (!sourceId || sourceId === row.id) return;
                e.preventDefault();
                // Cross-DB drops are refused by the store action — surface a
                // toast so the user understands why nothing happened (I-4702).
                const sourceRow = getStoreState().rows[sourceId];
                if (sourceRow && sourceRow.databaseId !== databaseId) {
                  window.dispatchEvent(new CustomEvent("toast", { detail: "Cannot move rows between databases" }));
                  return;
                }
                reorderDatabaseRows(databaseId, sourceId, row.id);
              }}
            >
              {visibleProps.map((p, idx) => (
                <td
                  key={p.id}
                  className={`border border-border px-2 py-1 align-top ${idx === 0 && p.type === "title" ? "sticky left-0 bg-card z-[1]" : ""}`}
                >
                  <PropertyCell database={db} property={p} row={row} />
                </td>
              ))}
              <td className="border border-border px-1 text-center whitespace-nowrap">
                <span
                  className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 mr-1 select-none"
                  title="Drag to reorder"
                  data-testid={`row-handle-${row.id}`}
                  aria-label="Drag row to reorder"
                >
                  ⋮⋮
                </span>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-row-detail", { detail: { rowId: row.id } }))}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 mr-1"
                  aria-label="Open row"
                  data-testid={`row-open-${row.id}`}
                  title="Open row"
                >
                  ⤢
                </button>
                <button
                  onClick={() => deleteRow(row.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  aria-label="Delete row"
                  data-testid={`row-delete-${row.id}`}
                >
                  <Trash className="size-3" />
                </button>
              </td>
              <td className="border border-border"></td>
            </tr>
          ))}
          <tr>
            <td colSpan={visibleProps.length + 2} className="border border-border px-2 py-1">
              <button
                onClick={() => addDatabaseRow(databaseId)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid={`table-add-${databaseId}`}
              >
                <Plus className="size-3" /> New row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PropertyHeader({ property, databaseId, viewId, sticky }: { property: Property; databaseId: string; viewId: string; sticky?: boolean }) {
  const [open, setOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(property.name);
  const db = useStore((s) => s.databases[databaseId]);
  const view = db?.views.find((v) => v.id === viewId);
  const currentSort = view?.sorts?.find((s) => s.propertyId === property.id);
  const isHidden = (view?.hiddenProperties ?? []).includes(property.id);

  function applySort(direction: "asc" | "desc") {
    if (!view) return;
    const existing = (view.sorts ?? []).filter((s) => s.propertyId !== property.id);
    updateView(databaseId, viewId, { sorts: [...existing, { propertyId: property.id, direction }] });
    setOpen(false);
  }
  function clearSort() {
    if (!view) return;
    updateView(databaseId, viewId, { sorts: (view.sorts ?? []).filter((s) => s.propertyId !== property.id) });
    setOpen(false);
  }
  function toggleHide() {
    if (!view) return;
    const hidden = view.hiddenProperties ?? [];
    const next = isHidden ? hidden.filter((id) => id !== property.id) : [...hidden, property.id];
    updateView(databaseId, viewId, { hiddenProperties: next });
    setOpen(false);
  }

  return (
    <th className={`border border-border px-2 py-1 text-left font-medium text-xs text-muted-foreground relative ${sticky ? "sticky left-0 bg-muted/60 z-[2]" : ""}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full text-left"
        data-testid={`prop-header-${property.id}`}
      >
        <span className="text-muted-foreground">{propIcon(property.type)}</span>
        {!renameOpen ? (
          <span className="truncate">{property.name}</span>
        ) : (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              updateDatabaseProperty(databaseId, property.id, { name });
              setRenameOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="bg-background border border-input rounded px-1 text-xs"
          />
        )}
        <ChevronDown className="size-3 ml-auto" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded shadow-lg z-30 w-56">
          <button
            onClick={() => {
              setRenameOpen(true);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
            data-testid={`prop-rename-${property.id}`}
          >
            Rename
          </button>
          <button
            onClick={() => applySort("asc")}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent ${currentSort?.direction === "asc" ? "font-medium bg-accent/50" : ""}`}
            data-testid={`prop-sort-asc-${property.id}`}
          >
            ↑ Sort ascending
          </button>
          <button
            onClick={() => applySort("desc")}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent ${currentSort?.direction === "desc" ? "font-medium bg-accent/50" : ""}`}
            data-testid={`prop-sort-desc-${property.id}`}
          >
            ↓ Sort descending
          </button>
          {currentSort && (
            <button
              onClick={clearSort}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent text-muted-foreground"
              data-testid={`prop-sort-clear-${property.id}`}
            >
              ✕ Clear sort
            </button>
          )}
          {property.type !== "title" && (
            <button
              onClick={toggleHide}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
              data-testid={`prop-hide-${property.id}`}
            >
              {isHidden ? "Show column" : "Hide column"}
            </button>
          )}
          <div className="border-t border-border my-1" />
          <div className="px-3 py-1 text-[10px] uppercase text-muted-foreground">Type</div>
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                const patch: Partial<Property> = { type: t } as Partial<Property>;
                if (t === "select" || t === "multi-select" || t === "status") {
                  (patch as Record<string, unknown>).options = [];
                }
                if (t === "status") {
                  (patch as Record<string, unknown>).groups = [];
                }
                if (t === "formula") {
                  (patch as Record<string, unknown>).expression = '""';
                }
                if (t === "rollup") {
                  // Sensible defaults so the cell doesn't render blank (B-601, B-704).
                  // If a relation property already exists, point at it so the cell
                  // shows a real value (count of linked rows) immediately.
                  const firstRelation = (databasesNow().find((d) => d.id === databaseId)?.properties ?? []).find(
                    (p) => p.type === "relation",
                  );
                  (patch as Record<string, unknown>).function = "count";
                  (patch as Record<string, unknown>).relationPropertyId = firstRelation?.id ?? "";
                  (patch as Record<string, unknown>).targetPropertyId = "";
                }
                updateDatabaseProperty(databaseId, property.id, patch);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent ${property.type === t ? "font-medium bg-accent/50" : ""}`}
            >
              {t}
            </button>
          ))}
          {property.type === "formula" && (
            <FormulaEditor databaseId={databaseId} property={property} close={() => setOpen(false)} />
          )}
          {property.type === "relation" && (
            <RelationConfigEditor databaseId={databaseId} property={property} close={() => setOpen(false)} />
          )}
          {property.type === "rollup" && (
            <RollupConfigEditor databaseId={databaseId} property={property} close={() => setOpen(false)} />
          )}
          {property.type === "unique-id" && (
            <UniqueIdPrefixEditor databaseId={databaseId} property={property} close={() => setOpen(false)} />
          )}
          {property.type !== "title" && (
            <button
              onClick={() => {
                if (confirm(`Delete "${property.name}" property?`)) {
                  removeDatabaseProperty(databaseId, property.id);
                }
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-accent"
              data-testid={`prop-delete-${property.id}`}
            >
              Delete property
            </button>
          )}
        </div>
      )}
    </th>
  );
}

function FormulaEditor({ databaseId, property, close }: { databaseId: string; property: Property; close: () => void }) {
  const [v, setV] = useState((property as { expression?: string }).expression ?? "");
  return (
    <div className="border-t border-border px-3 py-2">
      <label className="text-[10px] uppercase text-muted-foreground">Formula</label>
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => updateDatabaseProperty(databaseId, property.id, { expression: v } as Partial<Property>)}
        className="w-full bg-background border border-input rounded text-xs font-mono p-1 mt-1 min-h-[60px]"
        placeholder='prop("Name") + " ✓"'
      />
    </div>
  );
}

function RelationConfigEditor({ databaseId, property, close }: { databaseId: string; property: Property; close: () => void }) {
  const databases = useStore((s) => s.databases);
  const others = Object.values(databases).filter((d) => !d.isInTrash);
  const target = (property as { targetDatabaseId?: string }).targetDatabaseId;
  const isDual = (property as { isDual?: boolean }).isDual ?? false;
  return (
    <div className="border-t border-border px-3 py-2 space-y-1">
      <label className="text-[10px] uppercase text-muted-foreground">Relation target</label>
      <select
        value={target ?? ""}
        onChange={(e) => updateDatabaseProperty(databaseId, property.id, { targetDatabaseId: e.target.value } as Partial<Property>)}
        className="w-full bg-background border border-input rounded text-xs p-1"
        data-testid={`rel-target-${property.id}`}
      >
        <option value="">— pick a database —</option>
        {others.map((d) => (
          <option key={d.id} value={d.id}>{d.icon ?? "🗄️"} {d.name}</option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={isDual}
          onChange={(e) => updateDatabaseProperty(databaseId, property.id, { isDual: e.target.checked } as Partial<Property>)}
          data-testid={`rel-dual-${property.id}`}
        />
        Two-way relation (mirror on paired side)
      </label>
    </div>
  );
}

function RollupConfigEditor({ databaseId, property, close }: { databaseId: string; property: Property; close: () => void }) {
  const db = useStore((s) => s.databases[databaseId]);
  const databases = useStore((s) => s.databases);
  if (!db) return null;
  const relationProps = db.properties.filter((p) => p.type === "relation");
  const rp = property as Extract<Property, { type: "rollup" }>;
  const relProp = db.properties.find((p) => p.id === rp.relationPropertyId);
  const targetDb = relProp && relProp.type === "relation" ? databases[relProp.targetDatabaseId] : undefined;
  return (
    <div className="border-t border-border px-3 py-2 space-y-1">
      <label className="text-[10px] uppercase text-muted-foreground">Rollup — relation</label>
      <select
        value={rp.relationPropertyId ?? ""}
        onChange={(e) => updateDatabaseProperty(databaseId, property.id, { relationPropertyId: e.target.value } as Partial<Property>)}
        className="w-full bg-background border border-input rounded text-xs p-1"
        data-testid={`roll-rel-${property.id}`}
      >
        <option value="">— pick relation —</option>
        {relationProps.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <label className="text-[10px] uppercase text-muted-foreground">Target property</label>
      <select
        value={rp.targetPropertyId ?? ""}
        onChange={(e) => updateDatabaseProperty(databaseId, property.id, { targetPropertyId: e.target.value } as Partial<Property>)}
        className="w-full bg-background border border-input rounded text-xs p-1"
        data-testid={`roll-target-${property.id}`}
        disabled={!targetDb}
      >
        <option value="">— pick property —</option>
        {(targetDb?.properties ?? []).map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
        ))}
      </select>
      <label className="text-[10px] uppercase text-muted-foreground">Function</label>
      <select
        value={rp.function ?? "count"}
        onChange={(e) => updateDatabaseProperty(databaseId, property.id, { function: e.target.value } as Partial<Property>)}
        className="w-full bg-background border border-input rounded text-xs p-1"
        data-testid={`roll-func-${property.id}`}
      >
        {(["count", "count-values", "sum", "average", "min", "max", "earliest", "latest", "show-original"] as const).map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    </div>
  );
}

function UniqueIdPrefixEditor({ databaseId, property, close }: { databaseId: string; property: Property; close: () => void }) {
  const [v, setV] = useState((property as { prefix?: string }).prefix ?? "");
  return (
    <div className="border-t border-border px-3 py-2 space-y-1">
      <label className="text-[10px] uppercase text-muted-foreground">Unique-id prefix</label>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => updateDatabaseProperty(databaseId, property.id, { prefix: v } as Partial<Property>)}
        className="w-full bg-background border border-input rounded text-xs p-1"
        placeholder="e.g. BUG"
        data-testid={`uid-prefix-${property.id}`}
      />
    </div>
  );
}

function PropertyHeaderAdd({ databaseId }: { databaseId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("text");
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

  function create() {
    const n = name.trim() || "New property";
    const id = `prop_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const patch: Record<string, unknown> = { id, name: n, type };
    if (type === "select" || type === "multi-select" || type === "status") patch.options = [];
    if (type === "status") patch.groups = [];
    if (type === "formula") patch.expression = '""';
    if (type === "rollup") {
      // Default to count of linked rows from the first relation so cells render
      // immediately (B-704 / B-805). User can re-pick later.
      const db = getStoreState().databases[databaseId];
      const firstRelation = db?.properties.find((p) => p.type === "relation");
      patch.function = "count";
      patch.relationPropertyId = firstRelation?.id ?? "";
      patch.targetPropertyId = "";
    }
    if (type === "relation") {
      // Auto-pick the first other database as the target so the relation
      // works out of the box.
      const db = getStoreState().databases[databaseId];
      const others = Object.values(getStoreState().databases).filter(
        (d) => d.id !== databaseId && !d.isInTrash,
      );
      patch.targetDatabaseId = others[0]?.id ?? "";
      patch.isDual = false;
    }
    if (type === "unique-id") patch.prefix = "";
    if (type === "button") {
      patch.label = "Click";
      patch.actions = [];
    }
    addDatabaseProperty(databaseId, patch as Property);
    setName("");
    setType("text");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground p-1"
        aria-label="Add property"
        data-testid={`table-addprop-${databaseId}`}
      >
        <Plus className="size-3.5" />
      </button>
      {open && (
        <div className="absolute z-30 bg-popover border border-border rounded shadow-lg p-2 right-0 mt-1 w-60">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Property name"
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs mb-1"
            data-testid={`addprop-name-${databaseId}`}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PropertyType)}
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs mb-2"
            data-testid={`addprop-type-${databaseId}`}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={create}
            className="w-full bg-primary text-primary-foreground text-xs rounded py-1"
            data-testid={`addprop-create-${databaseId}`}
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
}

function propIcon(t: PropertyType) {
  const map: Record<PropertyType, string> = {
    title: "T",
    text: "≡",
    number: "#",
    select: "▼",
    "multi-select": "▼+",
    status: "◐",
    date: "📅",
    person: "👤",
    files: "📎",
    checkbox: "☑",
    url: "🔗",
    email: "@",
    phone: "📱",
    formula: "∑",
    relation: "↔",
    rollup: "↻",
    "created-time": "🕐",
    "created-by": "✎",
    "last-edited-time": "⏱",
    "last-edited-by": "✎",
    "unique-id": "ID",
    verification: "✓",
    button: "▶",
  };
  return map[t] ?? "·";
}
