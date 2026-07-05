"use client";

import React, { useState } from "react";

interface SidebarProps {
  activeProject: string;
  onProjectSelect: (project: string) => void;
  onNewConversation: () => void;
}

export function Sidebar({ activeProject, onProjectSelect, onNewConversation }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const projects = ["Core Library", "Infrastructure Ingestion", "Security Safety Guard"];
  const conversations = ["ADR HNSW Index Decision", "Sentry Log Hardening Check", "Upstash Redis TTL Tuning"];

  const filteredProjects = projects.filter((p) => p.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <aside 
      className={`h-screen border-r border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      aria-label="Application sidebar"
    >
      {/* Header section */}
      <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
        {!isCollapsed && <span className="font-bold text-sm tracking-wide">DEV-BRAIN</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--gray-100)] text-xs font-semibold"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "→" : "←"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Action button */}
          <div className="p-4">
            <button
              onClick={onNewConversation}
              className="w-full py-2 px-4 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold text-xs rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
            >
              + New Chat
            </button>
          </div>

          {/* Quick Search */}
          <div className="px-4 mb-4">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-[var(--card-border)] bg-[var(--background)] text-xs rounded-[var(--radius-sm)] focus:outline-none"
            />
          </div>

          {/* Projects lists */}
          <div className="flex-1 overflow-y-auto px-4 space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-[var(--foreground)] opacity-50 uppercase tracking-wider mb-2">
                Projects
              </h4>
              <ul className="space-y-1">
                {filteredProjects.map((proj) => (
                  <li key={proj}>
                    <button
                      onClick={() => onProjectSelect(proj)}
                      className={`w-full text-left text-xs p-2 rounded-[var(--radius-sm)] transition-colors ${
                        activeProject === proj 
                          ? "bg-[var(--gray-100)] font-semibold" 
                          : "hover:bg-[var(--gray-50)]"
                      }`}
                    >
                      {activeProject === proj && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />}
                      {proj}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conversations list */}
            <div>
              <h4 className="text-[10px] font-bold text-[var(--foreground)] opacity-50 uppercase tracking-wider mb-2">
                Conversations
              </h4>
              <ul className="space-y-1">
                {conversations.map((conv) => (
                  <li key={conv}>
                    <button className="w-full text-left text-xs p-2 rounded-[var(--radius-sm)] hover:bg-[var(--gray-50)] truncate">
                      💬 {conv}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
