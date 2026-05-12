import type { DatabaseRow, NotionDatabase, Filter, Sort } from "@/lib/types";

export function applyFilters(rows: DatabaseRow[], filters: Filter[], db: NotionDatabase): DatabaseRow[] {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((r) => filters.every((f) => evalFilter(r, f, db)));
}

function evalFilter(r: DatabaseRow, f: Filter, db: NotionDatabase): boolean {
  const v = r.values[f.propertyId];
  switch (f.operator) {
    case "contains":
      return typeof v === "string" && v.toLowerCase().includes(String(f.value).toLowerCase());
    case "does-not-contain":
      return typeof v !== "string" || !v.toLowerCase().includes(String(f.value).toLowerCase());
    case "is":
      return v === f.value;
    case "is-not":
      return v !== f.value;
    case "is-empty":
      return v == null || (Array.isArray(v) && v.length === 0) || v === "";
    case "is-not-empty":
      return !(v == null || (Array.isArray(v) && v.length === 0) || v === "");
    case "greater-than":
      return Number(v) > Number(f.value);
    case "less-than":
      return Number(v) < Number(f.value);
    case "greater-than-equal":
      return Number(v) >= Number(f.value);
    case "less-than-equal":
      return Number(v) <= Number(f.value);
    case "checked":
      return v === true;
    case "unchecked":
      return v === false || v == null;
    default:
      return true;
  }
}

export function applySorts(rows: DatabaseRow[], sorts: Sort[], db: NotionDatabase): DatabaseRow[] {
  if (!sorts || sorts.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sorts) {
      const av = a.values[s.propertyId];
      const bv = b.values[s.propertyId];
      const cmp = compareValues(av, bv);
      if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
