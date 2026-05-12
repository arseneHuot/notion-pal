import { createFileRoute } from "@tanstack/react-router";
import { useStore, upsertCalendarEvent, deleteCalendarEvent } from "@/lib/store";
import { useMemo, useState } from "react";
import { uid } from "@/lib/id";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const events = useStore((s) => s.calendarEvents);
  const databases = useStore((s) => s.databases);
  const rows = useStore((s) => s.rows);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week" | "day">("month");

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7;

  const days = useMemo(() => {
    const arr: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      arr.push({ date: new Date(first.getFullYear(), first.getMonth(), -startWeekday + i + 1), isCurrentMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      arr.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), isCurrentMonth: true });
    }
    while (arr.length % 7 !== 0) {
      const last2 = arr[arr.length - 1].date;
      arr.push({ date: new Date(last2.getFullYear(), last2.getMonth(), last2.getDate() + 1), isCurrentMonth: false });
    }
    return arr;
  }, [first, last, startWeekday, cursor]);

  function keyForDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  // Aggregate events from store + database rows with date
  const allEvents = useMemo(() => {
    const out: { id: string; title: string; date: string; color?: string; source: string }[] = [];
    for (const e of Object.values(events)) {
      out.push({
        id: e.id,
        title: e.title,
        date: new Date(e.start).toISOString().slice(0, 10),
        color: e.color,
        source: "calendar",
      });
    }
    for (const db of Object.values(databases)) {
      if (db.isInTrash) continue;
      const dateProp = db.properties.find((p) => p.type === "date");
      const titleProp = db.properties.find((p) => p.type === "title");
      if (!dateProp) continue;
      for (const rowId of db.rows) {
        const r = rows[rowId];
        if (!r || r.isInTrash) continue;
        const v = r.values[dateProp.id] as string | undefined;
        if (!v) continue;
        out.push({
          id: `row-${r.id}`,
          title: (titleProp ? (r.values[titleProp.id] as string) : "") || "Untitled",
          date: v.slice(0, 10),
          source: db.name,
          color: "#10b981",
        });
      }
    }
    return out;
  }, [events, databases, rows]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, typeof allEvents>();
    for (const e of allEvents) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return m;
  }, [allEvents]);

  function addEvent(day: string) {
    const title = prompt("Event title?");
    if (!title) return;
    upsertCalendarEvent({
      id: uid("evt"),
      title,
      start: new Date(day).getTime(),
      end: new Date(day).getTime() + 60 * 60 * 1000,
      allDay: true,
      description: "",
      location: "",
      calendarSource: "personal",
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-xs text-muted-foreground">Two-way synced with database date properties.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-1 hover:bg-accent rounded"
            data-testid="cal-prev"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="font-medium text-sm">
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-1 hover:bg-accent rounded"
            data-testid="cal-next"
          >
            <ChevronRight className="size-4" />
          </button>
          <button onClick={() => setCursor(new Date())} className="text-xs px-2 py-1 rounded border border-border">
            Today
          </button>
          <select value={view} onChange={(e) => setView(e.target.value as typeof view)} className="text-xs bg-background border border-input rounded px-2 py-1">
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 border border-border" data-testid="calendar-grid">
        {days.map(({ date, isCurrentMonth }) => {
          const k = keyForDate(date);
          const isToday = keyForDate(new Date()) === k;
          const list = eventsByDay.get(k) ?? [];
          return (
            <div
              key={k}
              onClick={() => setSelectedDay(k)}
              className={`border-r border-b border-border min-h-[100px] p-1 cursor-pointer ${isCurrentMonth ? "bg-card" : "bg-muted/20"} ${selectedDay === k ? "ring-1 ring-blue-400" : ""}`}
              data-testid={`day-${k}`}
            >
              <div className={`flex items-center justify-between text-xs ${isToday ? "font-bold text-blue-600" : ""}`}>
                <span>{date.getDate()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addEvent(k);
                  }}
                  className="hover:bg-accent rounded"
                  data-testid={`day-add-${k}`}
                >
                  <Plus className="size-3" />
                </button>
              </div>
              {list.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className="text-xs mt-0.5 px-1 py-0.5 rounded truncate"
                  style={{ background: e.color ?? "#3b82f6", color: "white" }}
                >
                  {e.title}
                </div>
              ))}
              {list.length > 3 && <div className="text-xs text-muted-foreground">+{list.length - 3}</div>}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 border border-border rounded p-3">
          <h3 className="font-semibold mb-2">{new Date(selectedDay).toLocaleDateString()}</h3>
          {(eventsByDay.get(selectedDay) ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No events. Click + on a day to add one.</div>
          ) : (
            (eventsByDay.get(selectedDay) ?? []).map((e) => (
              <div key={e.id} className="flex items-center gap-2 py-1">
                <div className="size-3 rounded" style={{ background: e.color ?? "#3b82f6" }} />
                <span className="text-sm flex-1">{e.title}</span>
                <span className="text-xs text-muted-foreground">{e.source}</span>
                {e.source === "calendar" && (
                  <button
                    onClick={() => deleteCalendarEvent(e.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
