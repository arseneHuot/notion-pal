import { useState, useMemo } from "react";
import { useStore, addDatabaseRow, updateRow } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { applyFilters } from "../filter";

export function CalendarView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const rowsMap = useStore((s) => s.rows);
  const view = db?.views.find((v) => v.id === viewId);
  const [cursor, setCursor] = useState(() => new Date());
  if (!db || !view || view.type !== "calendar") return null;
  const dateProp = db.properties.find((p) => p.id === view.dateProperty);
  if (!dateProp) {
    return <div className="text-sm text-muted-foreground p-4">Calendar requires a date property.</div>;
  }
  const titleProp = db.properties.find((p) => p.type === "title");

  const rows = db.rows.map((r) => rowsMap[r]).filter((r) => r && !r.isInTrash);
  const filtered = applyFilters(rows, (view.filters ?? []), db);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const days = useMemo(() => {
    const arr: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      arr.push({
        date: new Date(first.getFullYear(), first.getMonth(), -startWeekday + i + 1),
        isCurrentMonth: false,
      });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      arr.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), isCurrentMonth: true });
    }
    while (arr.length % 7 !== 0) {
      const last2 = arr[arr.length - 1].date;
      arr.push({
        date: new Date(last2.getFullYear(), last2.getMonth(), last2.getDate() + 1),
        isCurrentMonth: false,
      });
    }
    return arr;
  }, [cursor, first, last, startWeekday]);

  function keyForDate(d: Date) {
    // Use local time, not UTC, so "today" matches the user's day.
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const rowsByDay = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const r of filtered) {
      const dv = r.values[dateProp.id] as string | undefined;
      if (!dv) continue;
      const k = dv.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [filtered, dateProp.id]);

  return (
    <div className="border border-border rounded">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="p-1 hover:bg-accent rounded"
          data-testid={`cal-prev-${databaseId}`}
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="font-medium text-sm">
          {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date())}
            className="text-xs px-2 py-1 rounded hover:bg-accent"
            data-testid={`cal-today-${databaseId}`}
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-1 hover:bg-accent rounded"
            data-testid={`cal-next-${databaseId}`}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-xs font-medium border-b border-border">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="p-1 text-center text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" data-testid={`cal-grid-${databaseId}`}>
        {days.map(({ date, isCurrentMonth }) => {
          const k = keyForDate(date);
          const rows = rowsByDay.get(k) ?? [];
          const isToday = keyForDate(new Date()) === k;
          return (
            <div
              key={k}
              className={`border-r border-b border-border p-1 min-h-[80px] ${isCurrentMonth ? "bg-card" : "bg-muted/20"}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const rid = e.dataTransfer.getData("text/x-row-id");
                if (!rid) return;
                updateRow(rid, { values: { [dateProp.id]: k } });
              }}
            >
              <div className={`text-xs ${isToday ? "font-bold text-blue-600" : "text-muted-foreground"} flex items-center justify-between`}>
                <span>{date.getDate()}</span>
                <button
                  onClick={() => {
                    const newId = addDatabaseRow(databaseId);
                    updateRow(newId, { values: { [dateProp.id]: k } });
                  }}
                  className="opacity-0 hover:opacity-100 hover:bg-accent rounded text-xs"
                  data-testid={`cal-add-${k}`}
                >
                  +
                </button>
              </div>
              {rows.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/x-row-id", r.id)}
                  className="mt-0.5 px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 rounded text-xs truncate"
                  data-testid={`cal-event-${r.id}`}
                >
                  {titleProp ? (r.values[titleProp.id] as string) || "Untitled" : "Event"}
                </div>
              ))}
              {rows.length > 3 && (
                <div className="text-xs text-muted-foreground mt-0.5">+{rows.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
