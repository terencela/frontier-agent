"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What's happening tonight at the Tower?",
  "I just moved in — what should I know?",
  "Where can I find a laser cutter?",
  "How do I propose something to my floor treasury?",
  "Who's working on AI here and where should I be?",
];

function MessageContent({ content }: { content: string }) {
  // Render markdown-like bold and bullets
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[#5b5bd6] shrink-0 mt-0.5">·</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} />
            </div>
          );
        }
        if (line.startsWith("## ") || line.startsWith("# ")) {
          return <div key={i} className="font-semibold text-white text-sm mt-2" dangerouslySetInnerHTML={{ __html: boldify(line.replace(/^#+\s/, "")) }} />;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <div key={i} className="font-semibold text-white text-sm" dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <div key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
      })}
    </div>
  );
}

function boldify(text: string) {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
}

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

      if (!res.ok) {
        const err = await res.text();
        setMessages([...next, { role: "assistant", content: `⚠️ ${err}` }]);
        return;
      }

      if (!res.body) throw new Error("No stream body");
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
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages([...next, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
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
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-[#c8c8c8] text-sm">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1" fill="#5b5bd6" fillOpacity="0.9" />
            <rect x="11" y="1" width="6" height="6" rx="1" fill="#5b5bd6" fillOpacity="0.5" />
            <rect x="1" y="11" width="6" height="6" rx="1" fill="#5b5bd6" fillOpacity="0.5" />
            <rect x="11" y="11" width="6" height="6" rx="1" fill="#5b5bd6" fillOpacity="0.2" />
          </svg>
          <span className="text-white font-medium tracking-tight">Frontier Agent</span>
          <span className="text-[#333] text-xs font-mono">995 Market St · SF</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[#444] text-xs font-mono">live events</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-4 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-1.5">Frontier Tower</div>
              <p className="text-[#444] text-sm leading-relaxed">
                16 floors · 700+ residents · AI, biotech, crypto, arts, robotics.<br />
                Ask me anything about the building.
              </p>
            </div>
            <div className="w-full space-y-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left px-4 py-2.5 rounded-lg border border-[#1e1e1e] bg-[#0f0f0f] text-[#666] text-sm hover:border-[#2a2a2a] hover:text-[#aaa] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="shrink-0 w-5 h-5 mt-0.5 rounded bg-[#5b5bd6] bg-opacity-20 border border-[#5b5bd6] border-opacity-40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5b5bd6]" />
                  </div>
                )}
                <div
                  className={`leading-relaxed max-w-[85%] ${
                    m.role === "user"
                      ? "px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#222] text-[#bbb]"
                      : "text-[#b0b0b0]"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <MessageContent content={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {(streamingText || loading) && (
              <div className="flex gap-3 justify-start">
                <div className="shrink-0 w-5 h-5 mt-0.5 rounded bg-[#5b5bd6] bg-opacity-20 border border-[#5b5bd6] border-opacity-40 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5b5bd6]" />
                </div>
                {streamingText ? (
                  <div className="text-[#b0b0b0] leading-relaxed max-w-[85%]">
                    <MessageContent content={streamingText} />
                    <span className="inline-block w-0.5 h-3.5 bg-[#5b5bd6] ml-0.5 align-middle animate-pulse" />
                  </div>
                ) : (
                  <div className="flex gap-1 items-center py-1">
                    {[0, 150, 300].map((d) => (
                      <div
                        key={d}
                        className="w-1 h-1 rounded-full bg-[#333]"
                        style={{ animation: `pulse 1.2s ${d}ms infinite` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-5 pt-3 border-t border-[#1a1a1a]">
        <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2.5 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-4 py-3 focus-within:border-[#2a2a2a] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={onKeyDown}
              placeholder="Ask about the building..."
              rows={1}
              className="flex-1 bg-transparent text-[#ccc] text-sm placeholder-[#333] resize-none outline-none leading-relaxed"
              style={{ minHeight: "22px", maxHeight: "120px" }}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="shrink-0 w-6 h-6 rounded-md bg-[#5b5bd6] disabled:opacity-20 hover:bg-[#6c6ce0] transition-colors flex items-center justify-center"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 8.5L8.5 5L1.5 1.5V4.5L5.5 5L1.5 5.5V8.5Z" fill="white" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
