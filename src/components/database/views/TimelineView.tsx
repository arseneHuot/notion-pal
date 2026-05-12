import { useMemo, useState } from "react";
import { useStore, updateRow } from "@/lib/store";
import { applyFilters, applySorts } from "../filter";

export function TimelineView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const rowsMap = useStore((s) => s.rows);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view || view.type !== "timeline") return null;
  const startProp = db.properties.find((p) => p.id === view.startProperty);
  if (!startProp) {
    return <div className="text-sm text-muted-foreground p-4">Timeline requires a start date property.</div>;
  }
  const endProp = view.endProperty ? db.properties.find((p) => p.id === view.endProperty) : null;
  const titleProp = db.properties.find((p) => p.type === "title");
  const rows = db.rows.map((r) => rowsMap[r]).filter((r) => r && !r.isInTrash);
  const filtered = applyFilters(rows, (view.filters ?? []), db);
  const sorted = applySorts(filtered, (view.sorts ?? []), db);

  const dates = sorted.map((r) => (r.values[startProp.id] as string | undefined)).filter(Boolean) as string[];
  const minDate = dates.length > 0 ? new Date(dates.reduce((a, b) => (a < b ? a : b))) : new Date();
  const maxDate = dates.length > 0 ? new Date(dates.reduce((a, b) => (a > b ? a : b))) : new Date();
  const start = new Date(minDate); start.setDate(1);
  const end = new Date(maxDate); end.setDate(end.getDate() + 7);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  function position(dateStr: string | undefined): { x: number; w: number } | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const x = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { x, w: 1 };
  }

  return (
    <div className="overflow-x-auto border border-border rounded">
      <div className="flex border-b border-border bg-muted/30 text-xs">
        {Array.from({ length: totalDays }).map((_, i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          return (
            <div key={i} className="w-12 text-center py-1 border-r border-border" data-testid={`tl-day-${i}`}>
              {d.getDate()}
              {d.getDate() === 1 && (
                <div className="text-[10px] text-muted-foreground">{d.toLocaleString(undefined, { month: "short" })}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="relative">
        {sorted.map((r) => {
          const pos = position(r.values[startProp.id] as string | undefined);
          if (!pos) return null;
          const ep = endProp ? position(r.values[endProp.id] as string | undefined) : null;
          const w = ep ? Math.max(1, ep.x - pos.x + 1) : 2;
          return (
            <div key={r.id} className="relative h-7 border-b border-border">
              <div
                style={{ left: pos.x * 48, width: w * 48 }}
                onClick={() => window.dispatchEvent(new CustomEvent("open-row-detail", { detail: { rowId: r.id } }))}
                className="absolute top-1 bottom-1 bg-blue-200 dark:bg-blue-900 rounded px-2 text-xs flex items-center cursor-pointer hover:brightness-95"
                data-testid={`tl-bar-${r.id}`}
              >
                {titleProp ? (r.values[titleProp.id] as string) || "Untitled" : "Item"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
