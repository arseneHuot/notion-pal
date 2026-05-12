import { useState } from "react";
import { useStore, addDatabaseRow, deleteRow, removeDatabaseProperty, updateDatabaseProperty } from "@/lib/store";
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
  const filtered = applyFilters(rows, view.filters, db);
  const sorted = applySorts(filtered, view.sorts, db);
  const visibleProps = db.properties.filter((p) => !view.hiddenProperties.includes(p.id));

  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="border-collapse w-full text-sm">
        <thead>
          <tr className="bg-muted/40">
            {visibleProps.map((p) => (
              <PropertyHeader key={p.id} property={p} databaseId={databaseId} />
            ))}
            <th className="w-8"></th>
            <th className="w-8 border-b border-border">
              <PropertyHeaderAdd databaseId={databaseId} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="hover:bg-muted/20 group">
              {visibleProps.map((p) => (
                <td key={p.id} className="border border-border px-2 py-1 align-top">
                  <PropertyCell database={db} property={p} row={row} />
                </td>
              ))}
              <td className="border border-border px-1 text-center">
                <button
                  onClick={() => {
                    if (confirm("Delete row?")) deleteRow(row.id);
                  }}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
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

function PropertyHeader({ property, databaseId }: { property: Property; databaseId: string }) {
  const [open, setOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(property.name);

  return (
    <th className="border border-border px-2 py-1 text-left font-medium text-xs text-muted-foreground relative">
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
          <div className="px-3 py-1 text-[10px] uppercase text-muted-foreground">Type</div>
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                if (confirm(`Change property type to ${t}?`)) {
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
                  updateDatabaseProperty(databaseId, property.id, patch);
                }
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

function PropertyHeaderAdd({ databaseId }: { databaseId: string }) {
  return (
    <button
      onClick={() => {
        const name = prompt("Property name?");
        if (!name) return;
        const id = `${name}_${Math.random().toString(36).slice(2, 6)}`;
        useStore.toString;
        import("@/lib/store").then(({ addDatabaseProperty }) => {
          addDatabaseProperty(databaseId, { id, name, type: "text" });
        });
      }}
      className="text-muted-foreground hover:text-foreground p-1"
      data-testid={`table-addprop-${databaseId}`}
    >
      <Plus className="size-3.5" />
    </button>
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
