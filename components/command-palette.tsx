"use client";

import React, { useState, useEffect, useRef } from "react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: string) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectProject }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = [
    { type: "project", label: "Core Library" },
    { type: "project", label: "Infrastructure Ingestion" },
    { type: "project", label: "Security Safety Guard" },
    { type: "action", label: "Go to Settings" },
    { type: "action", label: "Trigger Data Deletion" },
  ];

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelectedIndex(0);
      setQuery("");
    }
  }

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard navigation logic
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          if (selected.type === "project") {
            onSelectProject(selected.label);
          } else {
            alert(`Command action selected: ${selected.label}`);
          }
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filtered, onClose, onSelectProject]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-xl bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] overflow-hidden">
        {/* Search input bar */}
        <div className="p-4 border-b border-[var(--card-border)] flex items-center">
          <span className="text-xs opacity-50 mr-3">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects or commands..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 text-sm bg-transparent text-[var(--foreground)] outline-none focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 border border-[var(--card-border)] bg-[var(--background)] rounded text-[10px] opacity-60">
            ESC
          </kbd>
        </div>

        {/* Results items */}
        {filtered.length > 0 ? (
          <ul className="max-h-60 overflow-y-auto p-2">
            {filtered.map((item, idx) => (
              <li key={idx}>
                <button
                  onClick={() => {
                    if (item.type === "project") {
                      onSelectProject(item.label);
                    } else {
                      alert(`Command action selected: ${item.label}`);
                    }
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-sm)] text-xs flex items-center justify-between transition-colors ${
                    idx === selectedIndex 
                      ? "bg-[var(--gray-100)] font-semibold text-[var(--foreground)]" 
                      : "hover:bg-[var(--gray-50)] text-[var(--foreground)] opacity-85"
                  }`}
                >
                  <span>
                    <span className="opacity-50 mr-2">{item.type === "project" ? "📁" : "⚡"}</span>
                    {item.label}
                  </span>
                  <span className="text-[10px] opacity-40 uppercase tracking-wider font-bold">
                    {item.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-xs opacity-50">No results found.</div>
        )}
      </div>
    </div>
  );
}
