"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message { role: "user" | "assistant"; content: string; }

const ROLES = [
  { emoji: "🧬", label: "Builder / Engineer", q: "I'm a builder — what floors and resources should I check out?" },
  { emoji: "💰", label: "Investor / VC", q: "I'm an investor — where do I meet founders and see demos?" },
  { emoji: "🎨", label: "Creative / Artist", q: "I'm a creative — what's the arts and music scene like here?" },
  { emoji: "🔬", label: "Researcher / Scientist", q: "I'm a researcher — tell me about the labs and science floors" },
  { emoji: "👋", label: "Just exploring", q: "I'm just curious — give me the highlights of the Tower" },
];

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• "))
          return <div key={i} className="flex gap-2 pl-0.5"><span className="text-amber-400/80 shrink-0">&#8250;</span><span dangerouslySetInnerHTML={{ __html: b(line.slice(2)) }} /></div>;
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
  const [name, setName] = useState("");
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

  function startWith(q: string) { send(q); }

  // WELCOME / ONBOARDING SCREEN
  if (screen === "welcome" && msgs.length === 0 && !streaming) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#0f1117] text-white overflow-auto">
        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-amber-500/8 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center max-w-md">
            {/* Logo */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[12px] text-[#999] font-medium tracking-wide">LIVE NOW — HACKATHON WEEKEND</span>
            </div>

            <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-[1.1] mb-3">
              <span className="bg-gradient-to-r from-white via-white to-[#999] bg-clip-text text-transparent">Frontier Tower</span>
            </h1>
            <p className="text-[#777] text-[15px] leading-relaxed mb-2">
              16 floors. 700+ members. AI, biotech, Ethereum, robotics, arts — all under one roof at 995 Market St, SF.
            </p>
            <p className="text-[#555] text-[13px] mb-8">
              This agent knows every floor, every event, every resource. Ask it anything.
            </p>

            {/* Name input */}
            <div className="mb-6">
              <p className="text-[#888] text-[13px] mb-2">What should I call you?</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) startWith(`Hey, I'm ${name}. What's happening at the Tower tonight?`); }}
                placeholder="Your name..."
                className="w-full max-w-[260px] mx-auto block px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-[14px] placeholder-[#444] outline-none focus:border-amber-500/40 transition-colors text-center"
                autoFocus
              />
            </div>

            {/* Role selection */}
            <p className="text-[#888] text-[13px] mb-3">I am a...</p>
            <div className="space-y-2 max-w-sm mx-auto">
              {ROLES.map((r) => (
                <button key={r.label} onClick={() => startWith(name ? `Hey, I'm ${name}. ${r.q}` : r.q)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[#bbb] text-[14px] hover:bg-white/[0.07] hover:border-amber-500/25 hover:text-white transition-all active:scale-[0.98] text-left">
                  <span className="text-lg">{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Or just type */}
            <div className="mt-6 flex items-center gap-3 max-w-sm mx-auto">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[#444] text-[11px] uppercase tracking-widest">or just ask</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="mt-3 max-w-sm mx-auto">
              <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) send(name ? `I'm ${name}. ${input}` : input); }}>
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-amber-500/30 transition-colors">
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-white text-[14px] placeholder-[#444] outline-none" />
                  <button type="submit" disabled={!input.trim()}
                    className="w-8 h-8 rounded-lg bg-amber-500 disabled:opacity-20 hover:bg-amber-400 transition-all flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 py-3 text-center">
          <p className="text-[#333] text-[10px]">Powered by Claude Sonnet 4 · ElevenLabs · Unbrowse</p>
        </div>
      </div>
    );
  }

  // CHAT SCREEN
  return (
    <div className="flex flex-col h-[100dvh] bg-[#0f1117] text-[#c0c0cc] text-[14px] leading-relaxed">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMsgs([]); setScreen("welcome"); setInput(""); }}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/15 hover:shadow-amber-500/30 transition-shadow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
          </button>
          <div>
            <h1 className="text-white font-semibold text-[15px] leading-tight">Frontier Tower</h1>
            <p className="text-[#555] text-[11px]">16 floors · 700+ members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/70 text-[11px] font-medium">Live</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
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
                <button onClick={() => speak(m.content, i)} title="Listen"
                  className={`shrink-0 self-start mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    playingIdx === i
                      ? "bg-amber-500/20 border border-amber-400/40 shadow-sm shadow-amber-500/10"
                      : "border border-white/[0.08] hover:border-amber-500/30 hover:bg-white/[0.04]"
                  }`}>
                  {playingIdx === i ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M15.54 8.46a5 5 0 010 7.07" stroke="#777" strokeWidth="2" strokeLinecap="round"/></svg>
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
      </div>

      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2 border-t border-white/[0.06]">
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
        </form>
      </div>
    </div>
  );
}
