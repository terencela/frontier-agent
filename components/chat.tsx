"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What's happening tonight?",
  "I just joined, what should I know?",
  "Where can I find a laser cutter?",
  "How do I propose something to my floor treasury?",
  "Who's working on AI here?",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function send(content: string) {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingText(full);
      }

      setMessages([...next, { role: "assistant", content: full }]);
      setStreamingText("");
    } catch (e) {
      console.error(e);
      setStreamingText("Something went wrong. Try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const showEmpty = messages.length === 0 && !streamingText;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#5b5bd6] shadow-[0_0_8px_#5b5bd6]" />
          <span className="text-sm font-mono text-white tracking-widest uppercase">Pulse</span>
          <span className="text-xs text-[#444] font-mono">Frontier Tower · 995 Market St, SF</span>
        </div>
        <a
          href="https://frontiertower.io"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[#444] hover:text-[#888] font-mono transition-colors"
        >
          frontiertower.io ↗
        </a>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-8 max-w-xl mx-auto text-center">
            <div>
              <div className="text-2xl font-semibold text-white mb-2">Good morning.</div>
              <p className="text-[#555] text-sm leading-relaxed">
                I know every floor, every resource, and what&apos;s happening right now.<br />
                Ask me anything about the building.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-lg border border-[#1e1e1e] bg-[#111] text-[#888] text-sm hover:border-[#333] hover:text-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} max-w-2xl mx-auto`}>
            {m.role === "assistant" && (
              <div className="w-5 h-5 rounded-full bg-[#5b5bd6] shrink-0 mt-1 mr-3 shadow-[0_0_6px_#5b5bd6]" />
            )}
            <div
              className={`px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap max-w-[80%] ${
                m.role === "user"
                  ? "bg-[#1a1a1a] text-white border border-[#2a2a2a]"
                  : "text-[#ddd]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex justify-start max-w-2xl mx-auto">
            <div className="w-5 h-5 rounded-full bg-[#5b5bd6] shrink-0 mt-1 mr-3 shadow-[0_0_6px_#5b5bd6]" />
            <div className="text-sm text-[#ddd] leading-relaxed whitespace-pre-wrap max-w-[80%] px-4 py-3">
              {streamingText}
              <span className="cursor" />
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="flex justify-start max-w-2xl mx-auto">
            <div className="w-5 h-5 rounded-full bg-[#5b5bd6] shrink-0 mt-1 mr-3 shadow-[0_0_6px_#5b5bd6]" />
            <div className="flex gap-1 px-4 py-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#444]"
                  style={{ animation: `blink 1.2s ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-6 pt-2 border-t border-[#1e1e1e]">
        <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 focus-within:border-[#333] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about events, floors, resources, governance..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-[#444] resize-none outline-none max-h-32 leading-relaxed"
              style={{ minHeight: "24px" }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="shrink-0 w-7 h-7 rounded-lg bg-[#5b5bd6] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#6c6ce0] transition-colors flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 10L10 6L2 2V5.5L7 6L2 6.5V10Z" fill="white" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[#333] text-xs mt-2 font-mono">
            ↵ send · shift+↵ newline
          </p>
        </form>
      </div>
    </div>
  );
}
