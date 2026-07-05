"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatInterface } from "@/components/chat-interface";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import { Settings } from "@/components/settings";
import { CommandPalette } from "@/components/command-palette";
import { NotificationToast, ToastMessage } from "@/components/notification-toast";

export default function Home() {
  const [activeProject, setActiveProject] = useState("Core Library");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listen for Ctrl+K / Cmd+K global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addToast = (message: string, type: ToastMessage["type"] = "info") => {
    const newToast: ToastMessage = {
      id: crypto.randomUUID(),
      type,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSelectProject = (project: string) => {
    setActiveProject(project);
    addToast(`Switched active workspace to ${project}`, "success");
  };

  const handleNewConversation = () => {
    addToast("New conversation thread initialized.", "info");
  };

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        {/* 1. Left Navigation Sidebar */}
        <ErrorBoundary>
          <Sidebar
            activeProject={activeProject}
            onProjectSelect={handleSelectProject}
            onNewConversation={handleNewConversation}
          />
        </ErrorBoundary>

        {/* 2. Main Chat Workspace */}
        <ErrorBoundary>
          <main className="flex-1 flex flex-col min-w-0" role="main">
            <header className="px-6 py-4 border-b border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wide uppercase opacity-75">
                Active Workspace: <span className="text-[var(--accent)]">{activeProject}</span>
              </h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsCommandOpen(true)}
                  className="text-xs opacity-60 font-mono hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-[var(--card-border)] bg-[var(--background)] rounded"
                >
                  Press <kbd>Ctrl+K</kbd> to search
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3 py-1.5 border border-[var(--card-border)] bg-[var(--card-bg)] rounded-[var(--radius-sm)] text-xs font-semibold hover:bg-[var(--gray-50)] transition-colors"
                >
                  ⚙ Settings
                </button>
              </div>
            </header>

            <ChatInterface />
          </main>
        </ErrorBoundary>

        {/* 3. Global Control Modals */}
        <ErrorBoundary>
          <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </ErrorBoundary>

        <ErrorBoundary>
          <CommandPalette
            isOpen={isCommandOpen}
            onClose={() => setIsCommandOpen(false)}
            onSelectProject={handleSelectProject}
          />
        </ErrorBoundary>

        {/* 4. Non blocking notifications layers */}
        <NotificationToast toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    </ThemeProvider>
  );
}
