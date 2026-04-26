"use client";
import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Trash2, HelpCircle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

// ═══ Global confirm function ═══
let _showConfirm: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

export function showConfirm(opts: ConfirmOptions | string): Promise<boolean> {
  const options = typeof opts === "string" ? { message: opts } : opts;
  if (_showConfirm) return _showConfirm(options);
  return Promise.resolve(window.confirm(options.message));
}

// ═══ Confirm Dialog Container (render once in layout) ═══
export function ConfirmDialogContainer() {
  const [state, setState] = useState<{
    open: boolean;
    opts: ConfirmOptions;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, opts: { message: "" }, resolve: null });

  const show = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, opts, resolve });
    });
  }, []);

  useEffect(() => {
    _showConfirm = show;
    return () => { _showConfirm = null; };
  }, [show]);

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState({ open: false, opts: { message: "" }, resolve: null });
  };

  // Close on Escape
  useEffect(() => {
    if (!state.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose(false);
      if (e.key === "Enter") handleClose(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!state.open) return null;

  const { opts } = state;
  const Icon = opts.danger ? Trash2 : opts.title?.includes("⚠") ? AlertTriangle : HelpCircle;
  const iconColor = opts.danger ? "text-red-500" : "text-amber-500";
  const btnColor = opts.danger
    ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ direction: "rtl" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => handleClose(false)} />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-confirm-enter">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 p-3 rounded-full ${opts.danger ? "bg-red-100" : "bg-amber-100"}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            {opts.title && (
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>
                {opts.title.replace(/^[⚠️🔴🗑️❌]\s*/, "")}
              </h3>
            )}
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line" style={{ fontFamily: "Cairo, sans-serif" }}>
              {opts.message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => handleClose(true)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition-all ${btnColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
            style={{ fontFamily: "Cairo, sans-serif" }}
            autoFocus
          >
            {opts.confirmText || "تأكيد"}
          </button>
          <button
            onClick={() => handleClose(false)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            {opts.cancelText || "إلغاء"}
          </button>
        </div>
      </div>
    </div>
  );
}
