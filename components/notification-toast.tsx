"use client";

import React, { useEffect } from "react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      aria-live="assertive"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onDismiss={onDismiss} 
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000); // Auto-dismiss after 4 seconds

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const typeStyles = {
    success: "bg-green-500 text-white border-green-600",
    warning: "bg-amber-500 text-white border-amber-600",
    error: "bg-red-500 text-white border-red-600",
    info: "bg-[var(--card-bg)] text-[var(--foreground)] border-[var(--card-border)]",
  };

  return (
    <div 
      className={`p-4 border rounded-[var(--radius-md)] shadow-[var(--shadow-subtle)] text-xs font-semibold flex items-center justify-between transition-all duration-300 ${
        typeStyles[toast.type]
      }`}
    >
      <span>{toast.message}</span>
      <button 
        onClick={() => onDismiss(toast.id)} 
        className="ml-3 hover:opacity-75 text-[10px]"
        aria-label="Dismiss message"
      >
        ✕
      </button>
    </div>
  );
}
