import { useMemo, useState } from "react";
import { useStore, updateView } from "@/lib/store";
import { applyFilters } from "../filter";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";

export function ChartView({ databaseId, viewId }: { databaseId: string; viewId: string }) {
  const db = useStore((s) => s.databases[databaseId]);
  const rowsMap = useStore((s) => s.rows);
  const view = db?.views.find((v) => v.id === viewId);
  if (!db || !view || view.type !== "chart") return null;
  const rows = db.rows.map((r) => rowsMap[r]).filter((r) => r && !r.isInTrash);
  const filtered = applyFilters(rows, (view.filters ?? []), db);

  // Group by the xProperty (default first non-title prop)
  const xProp = db.properties.find((p) => p.id === view.xProperty) ?? db.properties.find((p) => p.type !== "title");
  const yProp = db.properties.find((p) => p.id === view.yProperty) ?? null;

  const data = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    for (const r of filtered) {
      let key: string;
      if (xProp) {
        const v = r.values[xProp.id];
        if (Array.isArray(v)) {
          for (const item of v) {
            const k = String(item ?? "Empty");
            map.set(k, map.get(k) ?? { name: k, value: 0 });
            if (view.aggregation === "count" || !yProp) map.get(k)!.value += 1;
            else if (yProp) map.get(k)!.value += Number(r.values[yProp.id] ?? 0);
          }
          continue;
        }
        key = String(v ?? "Empty");
      } else {
        key = "Total";
      }
      map.set(key, map.get(key) ?? { name: key, value: 0 });
      if (view.aggregation === "count" || !yProp) map.get(key)!.value += 1;
      else map.get(key)!.value += Number(r.values[yProp.id] ?? 0);
    }
    return Array.from(map.values());
  }, [filtered, xProp, yProp, view.aggregation]);

  const total = data.reduce((a, b) => a + b.value, 0);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#84cc16"];

  return (
    <div className="border border-border rounded p-3">
      <div className="flex items-center gap-2 mb-3 text-xs">
        <label>Type:</label>
        <select
          value={view.chartType}
          onChange={(e) => updateView(databaseId, viewId, { chartType: e.target.value } as Partial<typeof view>)}
          className="bg-background border border-input rounded px-1 py-0.5"
          data-testid={`chart-type-${viewId}`}
        >
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="donut">Donut</option>
          <option value="number">Number</option>
        </select>
        <label>X:</label>
        <select
          value={view.xProperty ?? ""}
          onChange={(e) => updateView(databaseId, viewId, { xProperty: e.target.value } as Partial<typeof view>)}
          className="bg-background border border-input rounded px-1 py-0.5"
        >
          <option value="">First non-title</option>
          {db.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label>Y:</label>
        <select
          value={view.yProperty ?? ""}
          onChange={(e) => updateView(databaseId, viewId, { yProperty: e.target.value } as Partial<typeof view>)}
          className="bg-background border border-input rounded px-1 py-0.5"
        >
          <option value="">Count</option>
          {db.properties.filter((p) => p.type === "number").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ width: "100%", height: 280 }}>
        {view.chartType === "number" ? (
          <div className="text-5xl font-bold text-center" data-testid={`chart-number-${viewId}`}>
            {total}
          </div>
        ) : view.chartType === "donut" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : view.chartType === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
