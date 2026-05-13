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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Aggregate events from store + database rows with date
  const allEvents = useMemo(() => {
    const out: { id: string; title: string; date: string; color?: string; source: string }[] = [];
    for (const e of Object.values(events)) {
      out.push({
        id: e.id,
        title: e.title,
        // Use the local-time date key so it matches the grid (B-1135).
        date: keyForDate(new Date(e.start)),
        color: e.color,
        source: "calendar",
      });
    }
    for (const db of Object.values(databases)) {
      if (db.isInTrash) continue;
      // Defensive: a malformed DB written by a migration / synthetic seed
      // can have `properties` as undefined or a non-array. Skip it so the
      // calendar route never trips its ErrorBoundary (B-3205).
      if (!Array.isArray(db.properties)) continue;
      if (!Array.isArray(db.rows)) continue;
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

  // Inline event creation — no native prompt (B-206).
  function quickCreateEvent(day: string, title: string) {
    if (!title.trim()) return;
    upsertCalendarEvent({
      id: uid("evt"),
      title: title.trim(),
      start: new Date(day).getTime(),
      end: new Date(day).getTime() + 60 * 60 * 1000,
      allDay: true,
      description: "",
      location: "",
      calendarSource: "personal",
    });
  }

  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [composeTitle, setComposeTitle] = useState("");
  function addEvent(day: string) {
    setComposeFor(day);
    setComposeTitle("");
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
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="p-1 hover:bg-accent rounded"
            aria-label="Previous month"
            data-testid="cal-prev"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="font-medium text-sm">
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="p-1 hover:bg-accent rounded"
            aria-label="Next month"
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

      {view === "month" && (
        <>
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
                      aria-label={`Add event on ${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`}
                      title="Add event"
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
        </>
      )}
      {view === "week" && <WeekStrip cursor={cursor} eventsByDay={eventsByDay} keyForDate={keyForDate} onAdd={addEvent} onSelect={setSelectedDay} selectedDay={selectedDay} />}
      {view === "day" && <DayStrip cursor={cursor} eventsByDay={eventsByDay} keyForDate={keyForDate} onAdd={addEvent} />}

      {composeFor && (
        <div className="mt-4 border border-border rounded p-3 bg-card">
          <div className="text-xs text-muted-foreground mb-2">
            New event on {new Date(composeFor).toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <input
              autoFocus
              value={composeTitle}
              onChange={(e) => setComposeTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  quickCreateEvent(composeFor, composeTitle);
                  setComposeFor(null);
                  setComposeTitle("");
                }
                if (e.key === "Escape") setComposeFor(null);
              }}
              placeholder="Event title…"
              className="flex-1 bg-background border border-input rounded px-2 py-1 text-sm"
              data-testid="cal-compose-title"
            />
            <button
              onClick={() => {
                quickCreateEvent(composeFor, composeTitle);
                setComposeFor(null);
                setComposeTitle("");
              }}
              className="bg-primary text-primary-foreground rounded px-3 text-sm"
              data-testid="cal-compose-create"
            >
              Create
            </button>
            <button
              onClick={() => setComposeFor(null)}
              className="text-sm text-muted-foreground hover:text-foreground px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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

interface DayStripProps {
  cursor: Date;
  eventsByDay: Map<string, { id: string; title: string; date: string; color?: string; source: string }[]>;
  keyForDate: (d: Date) => string;
  onAdd: (day: string) => void;
}

function WeekStrip({ cursor, eventsByDay, keyForDate, onAdd, onSelect, selectedDay }: DayStripProps & { onSelect: (k: string) => void; selectedDay: string | null }) {
  // Start of week (Monday) for the cursor
  const day = cursor.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(cursor);
  start.setDate(start.getDate() + offsetToMonday);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="grid grid-cols-7 border border-border" data-testid="calendar-week-grid">
      {days.map((d) => {
        const k = keyForDate(d);
        const isToday = keyForDate(new Date()) === k;
        const list = eventsByDay.get(k) ?? [];
        return (
          <div
            key={k}
            onClick={() => onSelect(k)}
            className={`border-r border-border min-h-[300px] p-2 cursor-pointer ${selectedDay === k ? "ring-1 ring-blue-400" : ""}`}
            data-testid={`week-day-${k}`}
          >
            <div className={`flex items-center justify-between text-xs mb-1 ${isToday ? "font-bold text-blue-600" : ""}`}>
              <span>{d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</span>
              <button onClick={(e) => { e.stopPropagation(); onAdd(k); }} className="hover:bg-accent rounded">
                <Plus className="size-3" />
              </button>
            </div>
            {list.map((e) => (
              <div
                key={e.id}
                className="text-xs mt-0.5 px-1 py-0.5 rounded truncate"
                style={{ background: e.color ?? "#3b82f6", color: "white" }}
              >
                {e.title}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function DayStrip({ cursor, eventsByDay, keyForDate, onAdd }: DayStripProps) {
  const k = keyForDate(cursor);
  const list = eventsByDay.get(k) ?? [];
  // 24 hourly slots
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return (
    <div className="border border-border rounded" data-testid="calendar-day-grid">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="text-sm font-semibold">{cursor.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
        <button onClick={() => onAdd(k)} className="text-xs bg-primary text-primary-foreground rounded px-2 py-1">
          + Event
        </button>
      </div>
      {list.length > 0 && (
        <div className="px-3 py-2 border-b border-border space-y-1">
          {list.map((e) => (
            <div
              key={e.id}
              className="text-sm px-2 py-1 rounded truncate"
              style={{ background: e.color ?? "#3b82f6", color: "white" }}
            >
              {e.title}
            </div>
          ))}
        </div>
      )}
      <div className="divide-y divide-border">
        {hours.map((h) => (
          <div key={h} className="flex items-start gap-2 px-3 py-1.5 text-xs" data-testid={`day-hour-${h}`}>
            <div className="w-12 text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
            <div className="flex-1 min-h-[20px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
