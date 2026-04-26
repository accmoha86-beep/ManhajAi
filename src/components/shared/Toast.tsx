"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

// ═══ Global toast function ═══
let _showToast: ((message: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  if (_showToast) _showToast(message, type);
  else console.warn("Toast not mounted");
}

// ═══ Convenience shortcuts ═══
showToast.success = (msg: string) => showToast(msg, "success");
showToast.error = (msg: string) => showToast(msg, "error");
showToast.warning = (msg: string) => showToast(msg, "warning");
showToast.info = (msg: string) => showToast(msg, "info");

// ═══ Toast Container (render once in layout) ═══
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    // Auto-dismiss
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  useEffect(() => {
    _showToast = addToast;
    return () => { _showToast = null; };
  }, [addToast]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  };

  const config: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
    success: { icon: CheckCircle, bg: "bg-green-50", border: "border-green-400", text: "text-green-800" },
    error: { icon: XCircle, bg: "bg-red-50", border: "border-red-400", text: "text-red-800" },
    warning: { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-800" },
    info: { icon: Info, bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-800" },
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none" style={{ direction: "rtl" }}>
      {toasts.map((toast) => {
        const c = config[toast.type];
        const Icon = c.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border-2 shadow-lg backdrop-blur-sm ${c.bg} ${c.border} ${toast.exiting ? "animate-toast-exit" : "animate-toast-enter"}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${c.text}`} />
            <p className={`text-sm font-medium flex-1 leading-relaxed ${c.text}`} style={{ fontFamily: "Cairo, sans-serif" }}>
              {toast.message}
            </p>
            <button onClick={() => dismiss(toast.id)} className={`flex-shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity ${c.text}`}>
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
