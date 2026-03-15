"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What's happening tonight at the Tower?",
  "I just moved in — give me the full tour",
  "Where can I find a laser cutter?",
  "How do I propose something to my floor treasury?",
  "Who's working on AI and where should I go?",
];

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="text-indigo-400 shrink-0 mt-0.5">&#8250;</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} />
            </div>
          );
        }
        if (/^#{1,3}\s/.test(line)) {
          return <div key={i} className="font-semibold text-white text-[13px] mt-3 mb-1" dangerouslySetInnerHTML={{ __html: boldify(line.replace(/^#+\s/, "")) }} />;
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <div key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
      })}
    </div>
  );
}

function boldify(t: string) {
  return t.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-medium">$1</strong>');
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function speakText(text: string) {
    setSpeaking(true);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 800) }),
      });
      if (!res.ok) { setSpeaking(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play();
    } catch { setSpeaking(false); }
  }

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
        setMessages([...next, { role: "assistant", content: err }]);
        return;
      }
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
      setMessages([...next, { role: "assistant", content: e instanceof Error ? e.message : "Error" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function onSubmit(e: FormEvent) { e.preventDefault(); send(input); }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  const empty = messages.length === 0 && !streamingText;

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#a1a1aa] text-[13px] leading-relaxed">
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#18181b] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
          </div>
          <div>
            <span className="text-white font-semibold text-sm tracking-tight">Frontier Tower</span>
            <span className="text-[#52525b] text-xs ml-2">Agent</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#52525b] text-xs">live</span>
          </div>
          <a href="https://frontiertower.io" target="_blank" rel="noreferrer" className="text-[#52525b] text-xs hover:text-[#71717a] transition-colors">
            995 Market St, SF
          </a>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 px-4 max-w-lg mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
              </div>
              <h1 className="text-white text-xl font-semibold mb-1">Frontier Tower</h1>
              <p className="text-[#52525b] text-sm">
                16 floors &middot; 700+ residents &middot; AI, biotech, crypto, robotics, arts
              </p>
              <p className="text-[#3f3f46] text-xs mt-1">Ask me anything about the building</p>
            </div>
            <div className="w-full space-y-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left px-4 py-2.5 rounded-lg border border-[#18181b] bg-[#09090b] text-[#71717a] text-[13px] hover:border-[#27272a] hover:text-[#a1a1aa] hover:bg-[#0f0f12] transition-all"
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
                  <div className="shrink-0 w-6 h-6 mt-0.5 rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[85%] ${
                  m.role === "user"
                    ? "px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-[#d4d4d8]"
                    : "text-[#a1a1aa]"
                }`}>
                  {m.role === "assistant" ? <MessageContent content={m.content} /> : m.content}
                </div>
                {m.role === "assistant" && (
                  <button
                    onClick={() => speakText(m.content)}
                    disabled={speaking}
                    className="shrink-0 mt-0.5 w-6 h-6 rounded-md border border-[#27272a] flex items-center justify-center hover:border-[#3f3f46] transition-colors disabled:opacity-30"
                    title="Listen"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={speaking ? "#818cf8" : "#71717a"} strokeWidth="2.5">
                      <polygon points="5 3 19 12 5 21 5 3" fill={speaking ? "#818cf8" : "none"} />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {(streamingText || loading) && (
              <div className="flex gap-3 justify-start">
                <div className="shrink-0 w-6 h-6 mt-0.5 rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                </div>
                {streamingText ? (
                  <div className="text-[#a1a1aa] max-w-[85%]">
                    <MessageContent content={streamingText} />
                    <span className="inline-block w-0.5 h-3 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center py-2">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-1 h-1 rounded-full bg-[#3f3f46]" style={{ animation: `pulse 1.4s ${d}ms infinite` }} />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-5 pt-3 border-t border-[#18181b]">
        <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2.5 bg-[#0f0f12] border border-[#18181b] rounded-xl px-4 py-3 focus-within:border-[#27272a] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={onKeyDown}
              placeholder="Ask about events, floors, resources, governance..."
              rows={1}
              className="flex-1 bg-transparent text-[#d4d4d8] text-[13px] placeholder-[#3f3f46] resize-none outline-none leading-relaxed"
              style={{ minHeight: "22px", maxHeight: "120px" }}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="shrink-0 w-7 h-7 rounded-lg bg-indigo-600 disabled:opacity-20 hover:bg-indigo-500 transition-colors flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
