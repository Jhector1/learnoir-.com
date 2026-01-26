"use client";

import React, { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmResetModal({
  open,
  title = "Reset practice?",
  description = "This will clear your current answer and result. You can’t undo this.",
  confirmText = "Reset",
  cancelText = "Cancel",
  danger = true,
  onConfirm,
  onClose,
}: Props) {
  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const confirmCls = danger
    ? "bg-rose-500/90 hover:bg-rose-500 text-white"
    : "bg-emerald-500/90 hover:bg-emerald-500 text-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
        aria-label="Close modal"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-2xl">
        <div className="text-lg font-extrabold text-white/90">{title}</div>
        <div className="mt-2 text-sm text-white/70">{description}</div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/80 hover:bg-white/10"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={["h-10 rounded-xl px-4 text-sm font-extrabold", confirmCls].join(" ")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
