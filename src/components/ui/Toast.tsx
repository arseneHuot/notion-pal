import { useEffect, useState } from "react";

type Toast = { id: string; message: string; kind: "info" | "success" | "error"; createdAt: number };

let listeners: ((toast: Toast) => void)[] = [];

export function toast(message: string, kind: Toast["kind"] = "info") {
  const t: Toast = {
    id: Math.random().toString(36).slice(2),
    message,
    kind,
    createdAt: Date.now(),
  };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const fn = (t: Toast) => {
      setToasts((cur) => [...cur, t]);
      setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== t.id));
      }, 3500);
    };
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-md border px-3 py-2 text-sm shadow-md pointer-events-auto ${
            t.kind === "success"
              ? "bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200"
              : t.kind === "error"
                ? "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
                : "bg-card border-border text-foreground"
          }`}
          data-testid="toast"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
