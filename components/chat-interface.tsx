"use client";

import React, { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    document: string;
    similarity: number;
    confidence: number;
  }>;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello, I am your DevBrain second brain assistant. Ask me anything about engineering decisions or documents.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const userQuery = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsStreaming(true);

    // Add empty response placeholder for streaming tokens
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      // Setup mock authorization token
      const sessionToken = "chat_test_auth_token_789";
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!response.ok) {
        throw new Error("Chat api request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Readable stream is empty");

      const decoder = new TextDecoder();
      let completeText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Process standard SSE line tokens: data: {"text": "..."}
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              completeText += data.text;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  last.content = completeText;
                }
                return copy;
              });
            } catch {
              // Ignore lines that are partial or malformed
            }
          }
        }
      }

      // Add a mock citation info for demonstration
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          last.citations = [
            {
              document: "adr-0013-load-testing-strategy.md",
              similarity: 0.94,
              confidence: 0.95,
            },
          ];
        }
        return copy;
      });

    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          last.content = "Failed to compile response. Please try again.";
        }
        return copy;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[var(--background)]">
      {/* Scrollable messages container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-2xl p-4 rounded-[var(--radius-md)] ${msg.role === "user"
              ? "bg-[var(--gray-100)] text-[var(--foreground)] ml-auto"
              : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] mr-auto"
              }`}
          >
            <div className="text-xs opacity-50 uppercase tracking-wider mb-1 font-bold">
              {msg.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

            {/* Citations Expander Panel */}
            {msg.citations && msg.citations.length > 0 && (
              <details className="mt-4 border-t border-[var(--card-border)] pt-2">
                <summary className="text-xs font-semibold cursor-pointer text-[var(--accent)] select-none">
                  View Sources ({msg.citations.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {msg.citations.map((cit, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[var(--gray-50)] rounded-[var(--radius-sm)] text-[11px] flex justify-between items-center"
                    >
                      <span className="font-mono text-xs truncate max-w-xs">{cit.document}</span>
                      <span className="opacity-60">
                        Match: {(cit.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input query form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask DevBrain query..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isStreaming}
            className="flex-1 p-3 border border-[var(--card-border)] bg-[var(--background)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="px-4 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold text-xs rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
