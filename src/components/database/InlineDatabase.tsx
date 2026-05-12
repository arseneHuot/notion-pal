import { useMemo, useState } from "react";
import { useStore, updateDatabase, addDatabaseRow, updateRow, addDatabaseProperty, removeDatabaseProperty, updateDatabaseProperty, addView, removeView, updateView, deleteRow } from "@/lib/store";
import type { NotionDatabase, Property, View, DatabaseRow, BlockColor, SelectOption } from "@/lib/types";
import { TableView } from "./views/TableView";
import { BoardView } from "./views/BoardView";
import { CalendarView } from "./views/CalendarView";
import { ListView } from "./views/ListView";
import { GalleryView } from "./views/GalleryView";
import { TimelineView } from "./views/TimelineView";
import { ChartView } from "./views/ChartView";
import { FormView } from "./views/FormView";
import { Plus, Filter as FilterIcon, ArrowUpDown, Settings, MoreHorizontal } from "lucide-react";
import { uid } from "@/lib/id";

export function InlineDatabase({ databaseId, initialViewId }: { databaseId: string; initialViewId: string | null }) {
  const db = useStore((s) => s.databases[databaseId]);
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViewId);

  if (!db) {
    return <div className="text-sm text-muted-foreground">Database not found.</div>;
  }
  const activeView = useMemo(() => {
    return db.views.find((v) => v.id === activeViewId) ?? db.views[0];
  }, [db.views, activeViewId]);

  if (!activeView) return null;

  return (
    <div className="my-4">
      <div className="flex items-center gap-2 mb-2 border-b border-border">
        <input
          value={db.name}
          onChange={(e) => updateDatabase(databaseId, { name: e.target.value })}
          className="text-base font-semibold bg-transparent outline-none px-1"
          placeholder="Untitled database"
          data-testid={`db-name-${databaseId}`}
        />
        <div className="flex items-center gap-1 ml-2 mb-1">
          {db.views.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveViewId(v.id)}
              className={`text-xs px-2 py-1 rounded-t ${v.id === activeView.id ? "bg-accent font-medium" : "hover:bg-accent/50 text-muted-foreground"}`}
              data-testid={`db-view-${v.id}`}
            >
              {viewIcon(v.type)} {v.name}
            </button>
          ))}
          <NewViewButton databaseId={databaseId} onCreate={(viewId) => setActiveViewId(viewId)} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => {
              addDatabaseRow(databaseId);
            }}
            className="bg-primary text-primary-foreground text-xs rounded px-2 py-1 flex items-center gap-1"
            data-testid={`db-newrow-${databaseId}`}
          >
            <Plus className="size-3" /> New
          </button>
          <ViewMenu databaseId={databaseId} viewId={activeView.id} />
        </div>
      </div>
      <div>{renderView(db, activeView, activeView.id)}</div>
    </div>
  );
}

function viewIcon(t: View["type"]) {
  switch (t) {
    case "table": return "▦";
    case "board": return "▤";
    case "calendar": return "📅";
    case "gallery": return "▢";
    case "list": return "≣";
    case "timeline": return "⇆";
    case "chart": return "📊";
    case "form": return "🧾";
    case "map": return "🗺️";
  }
}

function renderView(db: NotionDatabase, view: View, viewId: string) {
  switch (view.type) {
    case "table":
      return <TableView databaseId={db.id} viewId={viewId} />;
    case "board":
      return <BoardView databaseId={db.id} viewId={viewId} />;
    case "calendar":
      return <CalendarView databaseId={db.id} viewId={viewId} />;
    case "list":
      return <ListView databaseId={db.id} viewId={viewId} />;
    case "gallery":
      return <GalleryView databaseId={db.id} viewId={viewId} />;
    case "timeline":
      return <TimelineView databaseId={db.id} viewId={viewId} />;
    case "chart":
      return <ChartView databaseId={db.id} viewId={viewId} />;
    case "form":
      return <FormView databaseId={db.id} viewId={viewId} />;
    case "map":
      return <div className="text-sm text-muted-foreground italic p-4">Map view (coming soon — geo properties not yet implemented).</div>;
    default:
      return null;
  }
}

function NewViewButton({ databaseId, onCreate }: { databaseId: string; onCreate: (viewId: string) => void }) {
  const [open, setOpen] = useState(false);
  const db = useStore((s) => s.databases[databaseId]);
  if (!db) return null;
  const titleProp = db.properties.find((p) => p.type === "title")?.id ?? db.properties[0]?.id ?? "";
  const dateProp = db.properties.find((p) => p.type === "date")?.id ?? titleProp;
  const statusProp = db.properties.find((p) => p.type === "status" || p.type === "select")?.id ?? titleProp;

  function add(type: View["type"]) {
    const id = uid("view");
    const base = {
      id,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} view`,
      filters: [],
      sorts: [],
      hiddenProperties: [],
      propertyOrder: db.properties.map((p) => p.id),
    };
    let view: View;
    switch (type) {
      case "table":
        view = { ...base, type, wrapCells: false } as View;
        break;
      case "board":
        view = { ...base, type, groupBy: statusProp, hiddenGroups: [] } as View;
        break;
      case "calendar":
        view = { ...base, type, dateProperty: dateProp } as View;
        break;
      case "gallery":
        view = { ...base, type, cardSize: "medium", fitImage: true } as View;
        break;
      case "list":
        view = { ...base, type } as View;
        break;
      case "timeline":
        view = { ...base, type, startProperty: dateProp } as View;
        break;
      case "chart":
        view = { ...base, type, chartType: "bar", aggregation: "count" } as View;
        break;
      case "form":
        view = { ...base, type, title: db.name, description: "", submitMessage: "Thanks!" } as View;
        break;
      case "map":
        view = { ...base, type, locationProperty: titleProp } as View;
        break;
    }
    addView(databaseId, view);
    onCreate(id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2 py-1 rounded-t hover:bg-accent/50 text-muted-foreground"
        data-testid={`db-newview-${databaseId}`}
      >
        + Add view
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-30 w-48">
          {(["table", "board", "calendar", "gallery", "list", "timeline", "chart", "form"] as View["type"][]).map((t) => (
            <button
              key={t}
              onClick={() => add(t)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2"
              data-testid={`db-newview-${databaseId}-${t}`}
            >
              <span>{viewIcon(t)}</span> {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewMenu({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const [open, setOpen] = useState(false);
  const db = useStore((s) => s.databases[databaseId]);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded hover:bg-accent"
        data-testid={`view-menu-${viewId}`}
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-30 w-56">
          <RenameViewItem databaseId={databaseId} viewId={viewId} viewName={view.name} close={() => setOpen(false)} />
          <button
            onClick={() => {
              if (db.views.length <= 1) {
                window.dispatchEvent(new CustomEvent("toast", { detail: "Cannot delete the only view" }));
                return;
              }
              removeView(databaseId, viewId);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent text-destructive"
            data-testid={`view-delete-${viewId}`}
          >
            Delete view
          </button>
          <div className="border-t border-border my-1" />
          <div className="px-3 py-1 text-[10px] uppercase text-muted-foreground">Sort</div>
          <SortControls databaseId={databaseId} viewId={viewId} />
          <div className="border-t border-border my-1" />
          <div className="px-3 py-1 text-[10px] uppercase text-muted-foreground">Filter</div>
          <FilterControls databaseId={databaseId} viewId={viewId} />
          <div className="border-t border-border my-1" />
          <div className="px-3 py-1 text-[10px] uppercase text-muted-foreground">Properties</div>
          {db.properties.map((p) => (
            <label key={p.id} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
              <input
                type="checkbox"
                checked={!view.hiddenProperties.includes(p.id)}
                onChange={() => {
                  const hidden = view.hiddenProperties.includes(p.id)
                    ? view.hiddenProperties.filter((x) => x !== p.id)
                    : [...view.hiddenProperties, p.id];
                  updateView(databaseId, viewId, { hiddenProperties: hidden });
                }}
              />
              <span className="flex-1">{p.name}</span>
            </label>
          ))}
          <div className="border-t border-border my-1" />
          <AddPropertyMenuItem databaseId={databaseId} viewId={viewId} close={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function AddPropertyMenuItem({ databaseId, viewId, close }: { databaseId: string; viewId: string; close: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
        data-testid={`view-addprop-${viewId}`}
      >
        + Add property
      </button>
    );
  }
  return (
    <div className="px-3 py-1.5 flex gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            const newProp: Property = { id: uid("prop"), name: name.trim(), type: "text" };
            addDatabaseProperty(databaseId, newProp);
            setName("");
            setOpen(false);
            close();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Property name"
        className="flex-1 bg-background border border-input rounded text-xs px-1"
      />
      <button
        onClick={() => {
          if (name.trim()) {
            const newProp: Property = { id: uid("prop"), name: name.trim(), type: "text" };
            addDatabaseProperty(databaseId, newProp);
            setName("");
            setOpen(false);
            close();
          }
        }}
        className="text-xs bg-primary text-primary-foreground rounded px-2"
      >
        Add
      </button>
    </div>
  );
}

function RenameViewItem({ databaseId, viewId, viewName, close }: { databaseId: string; viewId: string; viewName: string; close: () => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(viewName);
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
        data-testid={`view-rename-${viewId}`}
      >
        Rename view
      </button>
    );
  }
  return (
    <div className="px-3 py-1.5">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateView(databaseId, viewId, { name: v });
            setEditing(false);
            close();
          }
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => {
          updateView(databaseId, viewId, { name: v });
          setEditing(false);
        }}
        className="w-full bg-background border border-input rounded px-1.5 py-0.5 text-xs"
        data-testid={`view-rename-input-${viewId}`}
      />
    </div>
  );
}

function SortControls({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view) return null;
  const sorts = view.sorts ?? [];

  function addSort() {
    const firstProp = db.properties.find((p) => p.type !== "files" && p.type !== "person" && p.type !== "relation");
    if (!firstProp) return;
    updateView(databaseId, viewId, {
      sorts: [...sorts, { id: uid("sort"), propertyId: firstProp.id, direction: "asc" }],
    } as Partial<View>);
  }

  function updateSort(i: number, patch: Partial<typeof sorts[number]>) {
    const next = sorts.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    updateView(databaseId, viewId, { sorts: next } as Partial<View>);
  }

  function removeSort(i: number) {
    updateView(databaseId, viewId, { sorts: sorts.filter((_, idx) => idx !== i) } as Partial<View>);
  }

  return (
    <div className="px-3 py-1">
      {sorts.length === 0 && (
        <div className="text-[10px] text-muted-foreground italic mb-1">No sorts yet.</div>
      )}
      {sorts.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1 mb-1" data-testid={`sort-row-${i}`}>
          <select
            value={s.propertyId}
            onChange={(e) => updateSort(i, { propertyId: e.target.value })}
            className="bg-background border border-input rounded text-[11px] flex-1 max-w-[100px]"
          >
            {db.properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={s.direction}
            onChange={(e) => updateSort(i, { direction: e.target.value as "asc" | "desc" })}
            className="bg-background border border-input rounded text-[11px]"
          >
            <option value="asc">↑ Asc</option>
            <option value="desc">↓ Desc</option>
          </select>
          <button
            onClick={() => removeSort(i)}
            className="text-muted-foreground hover:text-destructive text-xs"
            aria-label="Remove sort"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addSort}
        className="text-[11px] text-muted-foreground hover:text-foreground"
        data-testid={`add-sort-${viewId}`}
      >
        + Add sort
      </button>
    </div>
  );
}

function FilterControls({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view) return null;
  const filters = view.filters ?? [];

  function addFilter() {
    const firstProp = db.properties[0];
    if (!firstProp) return;
    updateView(databaseId, viewId, {
      filters: [...filters, { id: uid("flt"), propertyId: firstProp.id, operator: "contains", value: "" }],
    } as Partial<View>);
  }

  function updateFilter(i: number, patch: Partial<typeof filters[number]>) {
    const next = filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    updateView(databaseId, viewId, { filters: next } as Partial<View>);
  }

  function removeFilter(i: number) {
    updateView(databaseId, viewId, { filters: filters.filter((_, idx) => idx !== i) } as Partial<View>);
  }

  const OPERATORS = ["contains", "does-not-contain", "is", "is-not", "is-empty", "is-not-empty", "greater-than", "less-than", "greater-than-equal", "less-than-equal", "checked", "unchecked"];

  return (
    <div className="px-3 py-1">
      {filters.length === 0 && (
        <div className="text-[10px] text-muted-foreground italic mb-1">No filters yet.</div>
      )}
      {filters.map((f, i) => {
        const valuelessOp = ["is-empty", "is-not-empty", "checked", "unchecked"].includes(f.operator);
        return (
          <div key={f.id} className="flex items-center gap-1 mb-1 flex-wrap" data-testid={`filter-row-${i}`}>
            <select
              value={f.propertyId}
              onChange={(e) => updateFilter(i, { propertyId: e.target.value })}
              className="bg-background border border-input rounded text-[11px] flex-1 max-w-[100px]"
            >
              {db.properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={f.operator}
              onChange={(e) => updateFilter(i, { operator: e.target.value })}
              className="bg-background border border-input rounded text-[11px]"
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            {!valuelessOp && (
              <input
                value={String(f.value ?? "")}
                onChange={(e) => updateFilter(i, { value: e.target.value })}
                className="bg-background border border-input rounded text-[11px] flex-1 px-1"
                placeholder="value"
              />
            )}
            <button
              onClick={() => removeFilter(i)}
              className="text-muted-foreground hover:text-destructive text-xs"
              aria-label="Remove filter"
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        onClick={addFilter}
        className="text-[11px] text-muted-foreground hover:text-foreground"
        data-testid={`add-filter-${viewId}`}
      >
        + Add filter
      </button>
    </div>
  );
}
