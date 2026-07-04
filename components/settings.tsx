"use client";

import React, { useState } from "react";
import { useTheme } from "./theme-provider";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("Developer User");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  if (!isOpen) return null;

  const handleDeleteData = async () => {
    if (deleteInput !== "DELETE") return;

    try {
      // Setup mock authorization token
      const sessionToken = "chat_test_auth_token_789";
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        alert("Your developer profile and RAG indexing data has been successfully deleted.");
        window.location.reload();
      } else {
        alert("Failed to delete user profile data.");
      }
    } catch {
      alert("Error occurred requesting data deletion.");
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-medium)] flex flex-col space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4">
          <h3 id="settings-title" className="text-sm font-bold uppercase tracking-wider">
            Account Settings
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded hover:bg-[var(--gray-100)] text-xs font-semibold"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* 1. Profile Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase opacity-60">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-2 border border-[var(--card-border)] bg-[var(--background)] rounded-[var(--radius-sm)] text-xs focus:outline-none"
          />
        </div>

        {/* 2. Appearance Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase opacity-60">Appearance Theme</label>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 text-xs rounded-[var(--radius-sm)] font-semibold border ${
                  theme === t
                    ? "bg-[var(--gray-100)] border-[var(--gray-300)]"
                    : "border-[var(--card-border)] hover:bg-[var(--gray-50)]"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Security & Destructive Action Section */}
        <div className="border-t border-[var(--card-border)] pt-6 space-y-4">
          <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Danger Zone</h4>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500 text-white font-semibold text-xs rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
            >
              Delete My Data
            </button>
          ) : (
            <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-[var(--radius-md)] space-y-3">
              <p className="text-xs text-[var(--foreground)] opacity-80">
                This action is irreversible. It will delete your profile, projects, search logs, conversations, and all vectorized long-term memory chunks.
              </p>
              <p className="text-xs font-bold text-red-500">
                Type &quot;DELETE&quot; below to confirm:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="w-full p-2 border border-red-500/30 bg-[var(--background)] rounded-[var(--radius-sm)] text-xs uppercase focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteData}
                  disabled={deleteInput !== "DELETE"}
                  className="px-4 py-2 bg-red-500 text-white font-semibold text-xs rounded-[var(--radius-sm)] disabled:opacity-50"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteInput("");
                  }}
                  className="px-4 py-2 border border-[var(--card-border)] text-xs rounded-[var(--radius-sm)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
