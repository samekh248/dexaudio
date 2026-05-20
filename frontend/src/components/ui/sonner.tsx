import { useEffect, useState } from "react";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
};

const listeners = new Set<(toast: ToastItem) => void>();

export function toast(title: string, opts?: { description?: string }) {
  const item: ToastItem = { id: Date.now(), title, description: opts?.description };
  listeners.forEach((fn) => fn(item));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 5000);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      aria-live="polite"
      role="status"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg"
        >
          <p className="font-medium">{t.title}</p>
          {t.description ? <p className="text-muted-foreground mt-1">{t.description}</p> : null}
        </div>
      ))}
    </div>
  );
}
