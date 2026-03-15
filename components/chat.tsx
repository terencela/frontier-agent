"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What's happening tonight?",
  "I just joined — where should I start?",
  "Where's the laser cutter?",
  "How do floor treasuries work?",
];

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
          return <div key={i} className="flex gap-2 pl-0.5"><span className="text-violet-400 shrink-0">&#8250;</span><span dangerouslySetInnerHTML={{ __html: bold(line.slice(2)) }} /></div>;
        }
        if (/^#{1,3}\s/.test(line)) return <div key={i} className="font-semibold text-white text-[15px] mt-3 mb-0.5" dangerouslySetInnerHTML={{ __html: bold(line.replace(/^#+\s/, "")) }} />;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <div key={i} dangerouslySetInnerHTML={{ __html: bold(line) }} />;
      })}
    </div>
  );
}

function bold(t: string) {
  return t.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-medium">$1</strong>');
}

export default function Chat() {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, streaming]);

  async function speak(text: string, idx: number) {
    if (audio.current) { audio.current.pause(); audio.current = null; }
    if (playingIdx === idx) { setPlayingIdx(null); return; }
    setPlayingIdx(idx);
    try {
      const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.slice(0, 600) }) });
      if (!r.ok) { setPlayingIdx(null); return; }
      const blob = await r.blob();
      const a = new Audio(URL.createObjectURL(blob));
      audio.current = a;
      a.onended = a.onerror = () => setPlayingIdx(null);
      a.play();
    } catch { setPlayingIdx(null); }
  }

  async function send(content: string) {
    if (!content.trim() || loading) return;
    const user: Message = { role: "user", content };
    const next = [...msgs, user];
    setMsgs(next); setInput(""); setLoading(true); setStreaming("");
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!r.ok || !r.body) { setMsgs([...next, { role: "assistant", content: await r.text().catch(() => "Something went wrong") }]); return; }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; full += dec.decode(value, { stream: true }); setStreaming(full); }
      setMsgs([...next, { role: "assistant", content: full }]);
      setStreaming("");
    } catch (e) { setMsgs([...next, { role: "assistant", content: e instanceof Error ? e.message : "Error" }]); }
    finally { setLoading(false); setTimeout(() => ta.current?.focus(), 50); }
  }

  const empty = msgs.length === 0 && !streaming;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0b0b0f] text-[#b8b8c8] text-[14px] leading-relaxed">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06] shrink-0 backdrop-blur-sm bg-[#0b0b0f]/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
          </div>
          <div>
            <h1 className="text-white font-semibold text-[15px] leading-tight">Frontier Tower</h1>
            <p className="text-[#555566] text-[11px]">16 floors · 700+ members · SF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/70 text-[11px] font-medium">Live</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {empty ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-5 py-6">
            <div className="text-center">
              <div className="relative inline-flex mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-[3px] border-[#0b0b0f] animate-pulse" />
              </div>
              <h2 className="text-white text-xl font-bold mb-1">Hey! Welcome to the Tower.</h2>
              <p className="text-[#666677] text-sm max-w-xs mx-auto">I know every floor, every event, every resource. What do you need?</p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-[#8888aa] text-[14px] hover:bg-white/[0.06] hover:border-violet-500/30 hover:text-[#bbbbcc] transition-all active:scale-[0.98]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-4 space-y-4 max-w-2xl mx-auto w-full">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-gradient-to-br from-violet-500/25 to-indigo-600/25 border border-violet-500/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                  </div>
                )}
                <div className={`max-w-[85%] ${
                  m.role === "user"
                    ? "px-4 py-2.5 rounded-2xl rounded-br-md bg-violet-600/20 border border-violet-500/20 text-[#dddde8]"
                    : "text-[#b8b8c8] pt-0.5"
                }`}>
                  {m.role === "assistant" ? <Markdown text={m.content} /> : m.content}
                </div>
                {m.role === "assistant" && (
                  <button onClick={() => speak(m.content, i)} title="Listen"
                    className={`shrink-0 self-start mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      playingIdx === i
                        ? "bg-violet-500/20 border border-violet-400/40"
                        : "border border-white/[0.08] hover:border-violet-500/30 hover:bg-white/[0.04]"
                    }`}>
                    {playingIdx === i ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#a78bfa"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </button>
                )}
              </div>
            ))}

            {(streaming || loading) && (
              <div className="flex gap-2.5 justify-start">
                <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-gradient-to-br from-violet-500/25 to-indigo-600/25 border border-violet-500/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                </div>
                {streaming ? (
                  <div className="text-[#b8b8c8] max-w-[85%] pt-0.5">
                    <Markdown text={streaming} />
                    <span className="inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle animate-pulse" />
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center py-3 px-1">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2 border-t border-white/[0.06]">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-2.5 focus-within:border-violet-500/40 transition-all">
            <textarea ref={ta} value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask anything about the Tower..."
              rows={1} disabled={loading} autoFocus
              className="flex-1 bg-transparent text-[#dddde8] text-[14px] placeholder-[#444455] resize-none outline-none"
              style={{ minHeight: "24px", maxHeight: "100px" }}
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 rounded-xl bg-violet-600 disabled:opacity-20 hover:bg-violet-500 active:scale-95 transition-all flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
