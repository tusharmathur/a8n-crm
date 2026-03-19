"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
  variant?: "success" | "error";
}

/** Auto-dismissing toast notification (bottom-right). */
export function Toast({ message, onDismiss, duration = 2000, variant = "success" }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const color = variant === "error" ? "#EF4444" : "#10B981";

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-white rounded-lg shadow-lg px-4 py-3 text-sm text-[#1E293B] transition-opacity duration-300 border-l-4 ${
        variant === "error" ? "border-[#EF4444]" : "border-[#10B981]"
      } ${visible ? "opacity-100" : "opacity-0"}`}
      role="status"
    >
      <span style={{ color }}>{variant === "error" ? "✕" : "✓"}</span>
      {message}
    </div>
  );
}

/** Hook to manage toast state. */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => setToast(message);
  const dismissToast = () => setToast(null);

  return { toast, showToast, dismissToast };
}
