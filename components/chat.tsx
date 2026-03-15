"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message { role: "user" | "assistant"; content: string; }

const ROLES = [
  { emoji: "🧬", label: "Builder / Engineer", q: "I'm a builder — what floors and resources should I check out?" },
  { emoji: "💰", label: "Investor / VC", q: "I'm an investor — where do I meet founders here?" },
  { emoji: "🎨", label: "Creative / Artist", q: "I'm a creative — what's the arts scene like?" },
  { emoji: "🔬", label: "Researcher", q: "I'm a researcher — tell me about the labs" },
  { emoji: "👋", label: "Just exploring", q: "Give me the highlights of the Tower" },
];

const FLOORS = [
  { n: "16", label: "d/acc Lounge", color: "#f59e0b" },
  { n: "12", label: "Ethereum", color: "#8b5cf6" },
  { n: "9", label: "AI Lab", color: "#3b82f6" },
  { n: "8", label: "Biotech", color: "#10b981" },
  { n: "7", label: "Maker Space", color: "#f97316" },
  { n: "6", label: "Arts", color: "#ec4899" },
  { n: "5", label: "Fitness", color: "#14b8a6" },
  { n: "4", label: "Robotics", color: "#ef4444" },
  { n: "2", label: "Events", color: "#a855f7" },
];

const QUICK_Q = [
  "What events are tonight?",
  "Where's the laser cutter?",
  "How do floor treasuries work?",
  "Who should I meet if I'm into AI?",
  "What's the vibe like right now?",
];

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        if (/^[-*•] /.test(line))
          return <div key={i} className="flex gap-2 pl-0.5"><span className="text-amber-400/70 shrink-0">&#8250;</span><span dangerouslySetInnerHTML={{ __html: b(line.slice(2)) }} /></div>;
        if (/^#{1,3}\s/.test(line))
          return <div key={i} className="font-semibold text-white text-[15px] mt-3 mb-0.5" dangerouslySetInnerHTML={{ __html: b(line.replace(/^#+\s/, "")) }} />;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <div key={i} dangerouslySetInnerHTML={{ __html: b(line) }} />;
      })}
    </div>
  );
}
function b(t: string) { return t.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-medium">$1</strong>'); }

export default function Chat() {
  const [screen, setScreen] = useState<"welcome" | "chat">("welcome");
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, streaming]);

  async function speak(text: string, idx: number) {
    if (audioEl.current) { audioEl.current.pause(); audioEl.current = null; }
    if (playingIdx === idx) { setPlayingIdx(null); return; }
    setPlayingIdx(idx);
    try {
      const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.slice(0, 600) }) });
      if (!r.ok) { setPlayingIdx(null); return; }
      const a = new Audio(URL.createObjectURL(await r.blob()));
      audioEl.current = a;
      a.onended = a.onerror = () => setPlayingIdx(null);
      a.play();
    } catch { setPlayingIdx(null); }
  }

  async function send(content: string) {
    if (!content.trim() || loading) return;
    if (screen === "welcome") setScreen("chat");
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

  // ── WELCOME SCREEN ──
  if (screen === "welcome" && msgs.length === 0 && !streaming) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#0f1117] text-white overflow-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-gradient-to-b from-amber-500/[0.07] to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center w-full max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] mb-5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-[#888] font-medium tracking-wide uppercase">Live — Hackathon Weekend</span>
            </div>

            <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.1] mb-2">Frontier Tower</h1>
            <p className="text-[#666] text-[14px] mb-6">16 floors. 700+ members. Your AI guide to the building.</p>

            {/* Role buttons */}
            <p className="text-[#777] text-[12px] mb-2 uppercase tracking-wider">I am a...</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {ROLES.map((r) => (
                <button key={r.label} onClick={() => send(r.q)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[#aaa] text-[13px] hover:bg-white/[0.07] hover:border-amber-500/25 hover:text-white transition-all active:scale-[0.97] text-left">
                  <span>{r.emoji}</span><span className="truncate">{r.label}</span>
                </button>
              ))}
            </div>

            {/* Floor chips */}
            <p className="text-[#777] text-[12px] mb-2 uppercase tracking-wider">Explore a floor</p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-5">
              {FLOORS.map((f) => (
                <button key={f.n} onClick={() => send(`Tell me about Floor ${f.n}`)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-all hover:scale-105 active:scale-95"
                  style={{ borderColor: f.color + "40", color: f.color, backgroundColor: f.color + "10" }}>
                  <span className="font-bold">{f.n}</span><span className="opacity-80">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Example questions */}
            <p className="text-[#777] text-[12px] mb-2 uppercase tracking-wider">Or try asking</p>
            <div className="space-y-1.5 mb-5">
              {QUICK_Q.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="w-full text-left px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[#888] text-[13px] hover:bg-white/[0.05] hover:text-[#bbb] hover:border-white/[0.12] transition-all">
                  {q}
                </button>
              ))}
            </div>

            {/* Free text */}
            <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) send(input); }}>
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-amber-500/30 transition-colors">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Or type your own question..."
                  className="flex-1 bg-transparent text-white text-[14px] placeholder-[#444] outline-none" autoFocus />
                <button type="submit" disabled={!input.trim()}
                  className="w-8 h-8 rounded-lg bg-amber-500 disabled:opacity-20 hover:bg-amber-400 transition-all flex items-center justify-center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="shrink-0 py-2 text-center">
          <p className="text-[#2a2a35] text-[10px]">Claude Sonnet 4 · ElevenLabs Voice · Unbrowse</p>
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ──
  const chatEmpty = msgs.length === 0;
  return (
    <div className="flex h-[100dvh] bg-[#0f1117] text-[#c0c0cc] text-[14px] leading-relaxed overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-white/[0.05] bg-[#0b0c10] px-3 py-4 gap-3 overflow-y-auto">
        <button onClick={() => { setMsgs([]); setScreen("welcome"); setInput(""); }}
          className="flex items-center gap-2 px-1 mb-1 group">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
          </div>
          <span className="text-white text-sm font-semibold group-hover:text-amber-400 transition-colors">Frontier Tower</span>
        </button>

        <div>
          <p className="text-[#3a3a45] text-[10px] uppercase tracking-widest mb-1.5 px-1">Floors</p>
          {FLOORS.map((f) => (
            <button key={f.n} onClick={() => send(`Tell me about Floor ${f.n}`)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors text-left">
              <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: f.color + "25", color: f.color }}>{f.n}</span>
              <span className="text-[#666] text-xs truncate">{f.label}</span>
            </button>
          ))}
        </div>

        <div>
          <p className="text-[#3a3a45] text-[10px] uppercase tracking-widest mb-1.5 px-1">Quick questions</p>
          {QUICK_Q.map((q) => (
            <button key={q} onClick={() => send(q)}
              className="w-full text-left px-2 py-1.5 rounded-md text-[#555] text-[11px] hover:bg-white/[0.04] hover:text-[#999] transition-colors truncate">
              {q}
            </button>
          ))}
        </div>

        <div className="mt-auto px-2 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[11px] font-medium">Hackathon Live</span>
          </div>
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMsgs([]); setScreen("welcome"); setInput(""); }}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/15 lg:hidden">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
            </button>
            <div>
              <h1 className="text-white font-semibold text-[15px]">Frontier Tower Agent</h1>
              <p className="text-[#555] text-[11px]">16 floors · 700+ members · SF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400/70 text-[11px] font-medium">Live</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {chatEmpty && !streaming && !loading ? (
            <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
              <p className="text-[#555] text-sm">Pick a question or type your own</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {QUICK_Q.slice(0, 3).map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="px-3 py-1.5 rounded-full border border-white/[0.08] text-[#777] text-[12px] hover:bg-white/[0.05] hover:text-white transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-4 space-y-4 max-w-2xl mx-auto w-full">
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/25 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${
                    m.role === "user"
                      ? "px-4 py-2.5 rounded-2xl rounded-br-md bg-white/[0.06] border border-white/[0.08] text-[#dde]"
                      : "text-[#bbc] pt-0.5"
                  }`}>
                    {m.role === "assistant" ? <Md text={m.content} /> : m.content}
                  </div>
                  {m.role === "assistant" && (
                    <button onClick={() => speak(m.content, i)} title={playingIdx === i ? "Stop" : "Listen to response"}
                      className={`shrink-0 self-start mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        playingIdx === i
                          ? "bg-amber-500/25 border-2 border-amber-400/50 shadow-md shadow-amber-500/20"
                          : "border border-white/[0.1] hover:border-amber-500/40 hover:bg-amber-500/10"
                      }`}>
                      {playingIdx === i ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#f59e0b" opacity="0.3"/><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15.54 8.46a5 5 0 010 7.07" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><path d="M19.07 4.93a10 10 0 010 14.14" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/></svg>
                      )}
                    </button>
                  )}
                </div>
              ))}

              {(streaming || loading) && (
                <div className="flex gap-2.5 justify-start">
                  <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/25 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                  {streaming ? (
                    <div className="text-[#bbc] max-w-[85%] pt-0.5">
                      <Md text={streaming} />
                      <span className="inline-block w-[2px] h-4 bg-amber-400 ml-0.5 align-middle animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex gap-1.5 items-center py-3 px-1">
                      {[0, 150, 300].map((d) => <div key={d} className="w-1.5 h-1.5 rounded-full bg-amber-400/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  )}
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Input bar with visible voice label */}
        <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2 border-t border-white/[0.05]">
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }} className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-2.5 focus-within:border-amber-500/30 transition-all">
              <textarea ref={ta} value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask anything about the Tower..."
                rows={1} disabled={loading} autoFocus
                className="flex-1 bg-transparent text-[#dde] text-[14px] placeholder-[#444] resize-none outline-none"
                style={{ minHeight: "24px", maxHeight: "100px" }}
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="shrink-0 w-9 h-9 rounded-xl bg-amber-500 disabled:opacity-20 hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
              </button>
            </div>
            <p className="text-center text-[#2a2a35] text-[10px] mt-1.5">Tap the speaker icon next to any response to hear it read aloud</p>
          </form>
        </div>
      </div>
    </div>
  );
}
