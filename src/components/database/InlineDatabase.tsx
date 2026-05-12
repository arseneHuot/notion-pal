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
          <button
            onClick={() => {
              const name = prompt("View name", view.name);
              if (name) updateView(databaseId, viewId, { name });
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
            data-testid={`view-rename-${viewId}`}
          >
            Rename view
          </button>
          <button
            onClick={() => {
              if (db.views.length <= 1) {
                alert("Cannot delete the only view");
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
          <button
            onClick={() => {
              const name = prompt("Property name?", "New property");
              if (!name) return;
              const newProp: Property = { id: uid("prop"), name, type: "text" };
              addDatabaseProperty(databaseId, newProp);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
            data-testid={`view-addprop-${viewId}`}
          >
            + Add property
          </button>
        </div>
      )}
    </div>
  );
}
