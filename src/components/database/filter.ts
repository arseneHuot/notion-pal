import type { DatabaseRow, NotionDatabase, Filter, Sort } from "@/lib/types";

export function applyFilters(rows: DatabaseRow[], filters: Filter[], db: NotionDatabase): DatabaseRow[] {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((r) => filters.every((f) => evalFilter(r, f, db)));
}

function propertyType(db: NotionDatabase, propertyId: string): string | undefined {
  return db.properties.find((p) => p.id === propertyId)?.type;
}

/** Coerce a filter-input value (always a string from `<input>`) to match the
 *  property's native runtime type so `is`/`is-not` comparisons stop returning
 *  zero rows for number/checkbox props (B-7900). Leaves the value untouched
 *  for string-shaped types so locale comparison still works. */
function coerceForCompare(v: unknown, pType: string | undefined): unknown {
  if (v == null) return v;
  if (pType === "number") {
    if (typeof v === "number") return v;
    const n = Number(v);
    return isNaN(n) ? v : n;
  }
  if (pType === "checkbox") {
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return v;
}

/** Coerce a value to a number if it looks like one, including ISO dates → ms. */
function toComparable(v: unknown, asDate: boolean): number {
  if (v == null) return NaN;
  if (asDate) {
    if (typeof v === "number") return v;
    const t = Date.parse(String(v));
    return isNaN(t) ? NaN : t;
  }
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? NaN : n;
}

function evalFilter(r: DatabaseRow, f: Filter, db: NotionDatabase): boolean {
  const v = r.values[f.propertyId];
  const pType = propertyType(db, f.propertyId);
  const dateProp = pType === "date";
  const arrayProp = pType === "multi-select" || pType === "files" || pType === "person" || pType === "relation";

  switch (f.operator) {
    case "contains": {
      const needle = String(f.value ?? "").toLowerCase();
      if (Array.isArray(v)) {
        // For multi-select / relation / person we compare option names or row labels by id (string).
        return v.some((item) => String(item ?? "").toLowerCase().includes(needle));
      }
      return typeof v === "string" && v.toLowerCase().includes(needle);
    }
    case "does-not-contain": {
      const needle = String(f.value ?? "").toLowerCase();
      if (Array.isArray(v)) {
        return !v.some((item) => String(item ?? "").toLowerCase().includes(needle));
      }
      return typeof v !== "string" || !v.toLowerCase().includes(needle);
    }
    case "is":
    case "equals": {
      // Accept both spellings — older seeds / imports use `equals` instead
      // of `is` and used to silently leak past the `default: return true`
      // (B-6700).
      if (Array.isArray(v)) return v.includes(coerceForCompare(f.value, pType) as never);
      // Coerce the filter input to the property's native type so a number
      // prop comparing against a string `"10"` matches `10` (B-7900). The
      // UI's `<input>` always emits strings; this used to silently return
      // zero rows.
      return v === coerceForCompare(f.value, pType);
    }
    case "is-not":
    case "not-equals": {
      if (Array.isArray(v)) return !v.includes(coerceForCompare(f.value, pType) as never);
      return v !== coerceForCompare(f.value, pType);
    }
    case "is-empty":
      return v == null || (Array.isArray(v) && v.length === 0) || v === "";
    case "is-not-empty":
      return !(v == null || (Array.isArray(v) && v.length === 0) || v === "");
    case "greater-than": {
      const a = toComparable(v, dateProp);
      const b = toComparable(f.value, dateProp);
      return !isNaN(a) && !isNaN(b) && a > b;
    }
    case "less-than": {
      const a = toComparable(v, dateProp);
      const b = toComparable(f.value, dateProp);
      return !isNaN(a) && !isNaN(b) && a < b;
    }
    case "greater-than-equal": {
      const a = toComparable(v, dateProp);
      const b = toComparable(f.value, dateProp);
      return !isNaN(a) && !isNaN(b) && a >= b;
    }
    case "less-than-equal": {
      const a = toComparable(v, dateProp);
      const b = toComparable(f.value, dateProp);
      return !isNaN(a) && !isNaN(b) && a <= b;
    }
    case "before":
      return dateProp
        ? !isNaN(toComparable(v, true)) && toComparable(v, true) < toComparable(f.value, true)
        : false;
    case "after":
      return dateProp
        ? !isNaN(toComparable(v, true)) && toComparable(v, true) > toComparable(f.value, true)
        : false;
    case "checked":
      return v === true;
    case "unchecked":
      return v === false || v == null;
    default: {
      // Unknown operator — warn once per session so authors notice (I-6702).
      // Returns true so the row is kept rather than dropped, matching the
      // prior conservative behaviour.
      if (typeof window !== "undefined") {
        const seen = (window as { __filterOpsSeen?: Set<string> }).__filterOpsSeen ?? new Set<string>();
        if (!seen.has(f.operator)) {
          seen.add(f.operator);
          (window as { __filterOpsSeen?: Set<string> }).__filterOpsSeen = seen;
          console.warn(`[filter] unknown operator "${f.operator}" — treated as no-op (row kept).`);
        }
      }
      return true;
    }
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
  // Try numeric comparison first (handles numeric strings, e.g. dates as ISO sort lexically OK)
  const an = Number(a);
  const bn = Number(b);
  if (!isNaN(an) && !isNaN(bn) && typeof a !== "boolean" && typeof b !== "boolean") return an - bn;
  return String(a).localeCompare(String(b));
}
