"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const FLOORS = [
  { n: "16", label: "d/acc Lounge", color: "#6366f1" },
  { n: "12", label: "Ethereum House", color: "#8b5cf6" },
  { n: "9", label: "AI & Autonomous", color: "#3b82f6" },
  { n: "8", label: "Neuro & Biotech", color: "#10b981" },
  { n: "7", label: "Maker Space", color: "#f59e0b" },
  { n: "6", label: "Arts & Music", color: "#ec4899" },
  { n: "5", label: "Fitness", color: "#14b8a6" },
  { n: "4", label: "Robotics", color: "#f97316" },
];

const SUGGESTED = [
  "I just moved in — what should I know?",
  "What's happening tonight at the Tower?",
  "I need a laser cutter — who do I talk to?",
  "How do I propose something to my floor treasury?",
  "Who's working on AI agents I should meet?",
];

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-indigo-400 shrink-0 mt-[3px] text-xs">▸</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} />
            </div>
          );
        }
        if (/^#{1,3}\s/.test(line)) {
          return (
            <div key={i} className="font-semibold text-white text-sm mt-4 mb-1 first:mt-0"
              dangerouslySetInnerHTML={{ __html: boldify(line.replace(/^#+\s/, "")) }} />
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <span key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
      })}
    </div>
  );
}

function boldify(t: string) {
  return t.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function speakText(text: string, idx: number) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (speakingIdx === idx) { setSpeaking(false); setSpeakingIdx(null); return; }
    setSpeaking(true);
    setSpeakingIdx(idx);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 800) }),
      });
      if (!res.ok) { setSpeaking(false); setSpeakingIdx(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); setSpeakingIdx(null); };
      audio.onerror = () => { setSpeaking(false); setSpeakingIdx(null); };
      audio.play();
    } catch { setSpeaking(false); setSpeakingIdx(null); }
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
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "Error");
        setMessages([...next, { role: "assistant", content: err }]);
        return;
      }
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
    <div className="flex h-screen bg-[#0c0c10] text-[#c4c4cf] text-sm leading-relaxed overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-white/[0.06] bg-[#0a0a0e] px-3 py-4 gap-4">
        <div className="px-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Frontier Tower</span>
          </div>
          <p className="text-[#4a4a5a] text-xs">995 Market St, SF · 700+ members</p>
        </div>

        <div>
          <p className="text-[#3a3a4a] text-[10px] uppercase tracking-widest mb-2 px-1">Floors</p>
          <div className="space-y-0.5">
            {FLOORS.map((f) => (
              <button key={f.n} onClick={() => send(`Tell me about Floor ${f.n} — ${f.label}`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors text-left group">
                <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: f.color + "33", color: f.color }}>
                  {f.n}
                </span>
                <span className="text-[#6a6a7a] text-xs group-hover:text-[#9a9aaa] transition-colors truncate">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <div className="px-2 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[11px] font-medium">Live — Hackathon Day</span>
            </div>
            <p className="text-[#5a5a7a] text-[10px]">1,000+ visitors · All floors active</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">Frontier Tower Agent</h1>
              <p className="text-[#4a4a5a] text-xs hidden sm:block">AI · Biotech · Ethereum · Robotics · Arts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#4a4a5a] text-xs">live</span>
            </div>
            <a href="https://frontiertower.io" target="_blank" rel="noreferrer"
              className="text-[#4a4a5a] text-xs hover:text-[#7a7a9a] transition-colors hidden sm:block">
              frontiertower.io ↗
            </a>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {empty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-4 py-8">
              <div className="text-center max-w-sm">
                <div className="relative inline-flex mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0c0c10] animate-pulse" />
                </div>
                <h2 className="text-white text-lg font-semibold mb-1.5">Frontier Tower Agent</h2>
                <p className="text-[#5a5a7a] text-sm">
                  Your guide to 16 floors, 700+ members, live events, resources, and floor governance.
                </p>
              </div>

              <div className="w-full max-w-md space-y-2">
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="w-full text-left px-4 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] text-[#8a8a9a] text-sm hover:bg-white/[0.05] hover:border-white/[0.12] hover:text-[#b4b4c4] transition-all">
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {FLOORS.map((f) => (
                  <button key={f.n} onClick={() => send(`What's on Floor ${f.n}?`)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all hover:scale-105"
                    style={{ borderColor: f.color + "44", color: f.color, backgroundColor: f.color + "11" }}>
                    <span className="font-bold">{f.n}</span>
                    <span className="opacity-75">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto w-full">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
                    </div>
                  )}
                  <div className={`max-w-[82%] ${
                    m.role === "user"
                      ? "px-4 py-2.5 rounded-2xl rounded-tr-sm bg-indigo-600/20 border border-indigo-500/25 text-[#d4d4e4]"
                      : "text-[#b4b4c4]"
                  }`}>
                    {m.role === "assistant" ? <MessageContent content={m.content} /> : m.content}
                  </div>
                  {m.role === "assistant" && (
                    <button onClick={() => speakText(m.content, i)} title={speakingIdx === i ? "Stop" : "Listen"}
                      className="shrink-0 mt-1 w-6 h-6 rounded-lg border border-white/[0.08] flex items-center justify-center hover:border-white/20 transition-all hover:bg-white/[0.05]">
                      {speakingIdx === i ? (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="#818cf8"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      ) : (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5a5a7a" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      )}
                    </button>
                  )}
                </div>
              ))}

              {(streamingText || loading) && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  </div>
                  {streamingText ? (
                    <div className="text-[#b4b4c4] max-w-[82%]">
                      <MessageContent content={streamingText} />
                      <span className="inline-block w-0.5 h-3.5 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex gap-1 items-center py-3">
                      {[0, 200, 400].map((d) => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#3a3a5a] animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
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
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-white/[0.06]">
          <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-indigo-500/40 focus-within:bg-white/[0.04] transition-all">
              <textarea ref={inputRef} value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={onKeyDown}
                placeholder="Ask about events, floors, resources, governance..."
                rows={1}
                disabled={loading}
                autoFocus
                className="flex-1 bg-transparent text-[#d4d4e4] text-sm placeholder-[#3a3a5a] resize-none outline-none leading-relaxed"
                style={{ minHeight: "22px", maxHeight: "120px" }}
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 rounded-xl bg-indigo-600 disabled:opacity-20 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-[#2a2a3a] text-[10px] mt-2">
              Powered by live Luma events · Claude Sonnet 4 · ElevenLabs voice
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
