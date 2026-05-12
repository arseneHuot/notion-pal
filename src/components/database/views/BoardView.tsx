import { useMemo, useState } from "react";
import { useStore, addDatabaseRow, updateRow } from "@/lib/store";
import { PropertyCell } from "../PropertyEditor";
import { applyFilters, applySorts } from "../filter";
import { Plus } from "lucide-react";
import type { DatabaseRow, SelectOption } from "@/lib/types";

export function BoardView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const rowsMap = useStore((s) => s.rows);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view || view.type !== "board") return null;
  const groupBy = db.properties.find((p) => p.id === view.groupBy);
  const visibleProps = db.properties.filter((p) => !view.hiddenProperties.includes(p.id) && p.id !== view.groupBy);

  const rows = db.rows.map((r) => rowsMap[r]).filter((r) => r && !r.isInTrash);
  const filtered = applyFilters(rows, view.filters, db);
  const sorted = applySorts(filtered, view.sorts, db);

  const groups = useMemo(() => {
    if (!groupBy || (groupBy.type !== "select" && groupBy.type !== "status" && groupBy.type !== "multi-select")) {
      return [{ id: "_all", name: "All", color: "default" as const, rows: sorted }];
    }
    const opts = (groupBy as { options: SelectOption[] }).options;
    const map = new Map<string, DatabaseRow[]>();
    map.set("_no_value", []);
    for (const o of opts) map.set(o.id, []);
    for (const r of sorted) {
      const v = r.values[groupBy.id];
      const ids = Array.isArray(v) ? v : v ? [v as string] : [];
      if (ids.length === 0) {
        map.get("_no_value")!.push(r);
      } else {
        for (const id of ids) {
          if (!map.has(id)) map.set(id, []);
          map.get(id)!.push(r);
        }
      }
    }
    return [
      { id: "_no_value", name: "No status", color: "default" as const, rows: map.get("_no_value")! },
      ...opts.map((o) => ({ id: o.id, name: o.name, color: o.color, rows: map.get(o.id) ?? [] })),
    ];
  }, [groupBy, sorted]);

  function onDrop(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    const rowId = e.dataTransfer.getData("text/x-row-id");
    if (!rowId) return;
    if (!groupBy) return;
    const v = groupId === "_no_value" ? (groupBy.type === "multi-select" ? [] : null) : (groupBy.type === "multi-select" ? [groupId] : groupId);
    updateRow(rowId, { values: { [groupBy.id]: v } });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {groups.map((g) => (
        <div key={g.id} className="w-64 shrink-0 bg-muted/30 rounded p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, g.id)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">{g.name}</span>
            <span className="text-xs text-muted-foreground">{g.rows.length}</span>
          </div>
          <div className="space-y-2">
            {g.rows.map((r) => (
              <div
                key={r.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/x-row-id", r.id)}
                className="bg-card border border-border rounded p-2 text-sm shadow-sm"
                data-testid={`board-card-${r.id}`}
              >
                {visibleProps.map((p) => (
                  <div key={p.id} className="mb-0.5">
                    <PropertyCell database={db} property={p} row={r} className="text-sm" />
                  </div>
                ))}
              </div>
            ))}
            <button
              onClick={() => {
                const id = addDatabaseRow(databaseId);
                if (groupBy && g.id !== "_no_value") {
                  const v = groupBy.type === "multi-select" ? [g.id] : g.id;
                  updateRow(id, { values: { [groupBy.id]: v } });
                }
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1"
              data-testid={`board-add-${g.id}`}
            >
              <Plus className="size-3" /> New
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
