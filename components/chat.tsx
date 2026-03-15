"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;

interface Message { role: "user" | "assistant"; content: string; }

const STEPS = [
  { id: "role", label: "Who are you?", options: [
    { emoji: "🛠", text: "Builder / Engineer", q: "I'm a builder — what floors and resources should I check out?" },
    { emoji: "💼", text: "Investor / VC", q: "I'm an investor — where do I meet founders here?" },
    { emoji: "🎨", text: "Creative / Artist", q: "I'm a creative — what's the arts and music scene?" },
    { emoji: "🔬", text: "Researcher", q: "I'm a researcher — tell me about the labs and science floors" },
    { emoji: "🤝", text: "Just visiting", q: "I'm visiting — give me the best highlights of the Tower" },
  ]},
  { id: "interest", label: "What are you looking for?", options: [
    { emoji: "📅", text: "Tonight's events", q: "What events are happening tonight?" },
    { emoji: "🔧", text: "Resources & tools", q: "What resources and equipment can I use here?" },
    { emoji: "👥", text: "Meet people", q: "Who should I connect with based on my interests?" },
    { emoji: "🏛", text: "Floor tour", q: "Walk me through the most interesting floors" },
    { emoji: "💰", text: "Governance & funding", q: "How do floor treasuries and governance work?" },
  ]},
];

const FLOORS = [
  { n: "16", label: "d/acc Lounge", c: "#b91c1c" },
  { n: "12", label: "Ethereum", c: "#6d28d9" },
  { n: "9", label: "AI Lab", c: "#1d4ed8" },
  { n: "8", label: "Biotech", c: "#047857" },
  { n: "7", label: "Maker Space", c: "#b45309" },
  { n: "6", label: "Arts & Music", c: "#be185d" },
  { n: "5", label: "Fitness", c: "#0f766e" },
  { n: "4", label: "Robotics", c: "#dc2626" },
  { n: "2", label: "The Spaceship", c: "#7c3aed" },
];

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        if (/^[-*•] /.test(line))
          return <div key={i} className="flex gap-2 pl-1"><span className="text-red-700 shrink-0 font-bold text-xs mt-[3px]">&bull;</span><span dangerouslySetInnerHTML={{ __html: bld(line.slice(2)) }} /></div>;
        if (/^#{1,3}\s/.test(line))
          return <div key={i} className="font-semibold text-stone-900 text-[15px] mt-3 mb-0.5" dangerouslySetInnerHTML={{ __html: bld(line.replace(/^#+\s/, "")) }} />;
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        return <div key={i} dangerouslySetInnerHTML={{ __html: bld(line) }} />;
      })}
    </div>
  );
}
function bld(t: string) { return t.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-stone-900 font-semibold">$1</strong>'); }

export default function Chat() {
  const [screen, setScreen] = useState<"welcome" | "chat">("welcome");
  const [step, setStep] = useState(0);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SR>(null);

  useEffect(() => {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (SR) setVoiceSupported(true);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, streaming]);

  function toggleVoice() {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const SRCtor = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SRCtor) return;
    const recognition = new (SRCtor as any)();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    setListening(true);

    let finalTranscript = "";
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interim);
    };
    recognition.onend = () => {
      setListening(false);
      if (finalTranscript.trim()) {
        send(finalTranscript.trim());
      }
    };
    recognition.onerror = () => { setListening(false); };
    recognition.start();
  }

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

  // ── WELCOME ──
  if (screen === "welcome" && msgs.length === 0 && !streaming) {
    const currentStep = STEPS[step];
    return (
      <div className="flex flex-col h-[100dvh] bg-[#fafaf9] overflow-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
            </div>
            <div>
              <p className="text-stone-900 font-semibold text-[15px] leading-tight">Frontier Tower</p>
              <p className="text-stone-400 text-[11px]">995 Market St, San Francisco</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 text-[11px] font-medium">Live</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
          <div className="w-full max-w-md">
            {/* Progress */}
            <div className="flex gap-2 mb-8">
              {STEPS.map((_, idx) => (
                <div key={idx} className={`h-1 flex-1 rounded-full transition-all ${idx <= step ? "bg-red-700" : "bg-stone-200"}`} />
              ))}
            </div>

            {/* Step heading */}
            <h1 className="text-stone-900 text-[24px] sm:text-[28px] font-bold tracking-tight mb-1.5">
              {currentStep.label}
            </h1>
            <p className="text-stone-400 text-[14px] mb-6">
              {step === 0 ? "We'll personalize your experience based on your background." : "This helps us show you the most relevant parts of the building."}
            </p>

            {/* Options */}
            <div className="space-y-2.5 mb-6">
              {currentStep.options.map((opt) => (
                <button key={opt.text}
                  onClick={() => { if (step < STEPS.length - 1) { setStep(step + 1); } else { send(opt.q); } }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-[14px] font-medium hover:border-red-300 hover:bg-red-50/50 hover:text-stone-900 transition-all active:scale-[0.98] text-left shadow-sm">
                  <span className="text-[18px]">{opt.emoji}</span>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>

            {/* Floor chips */}
            {step === 0 && (
              <div className="mb-6">
                <p className="text-stone-400 text-[12px] font-medium uppercase tracking-wider mb-2.5">Or explore a floor directly</p>
                <div className="flex flex-wrap gap-2">
                  {FLOORS.map((f) => (
                    <button key={f.n} onClick={() => send(`Tell me about Floor ${f.n}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-stone-200 hover:border-stone-400 transition-all active:scale-95"
                      style={{ color: f.c }}>
                      <span className="font-bold">{f.n}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skip / free input */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-stone-300 text-[11px] uppercase tracking-widest">or ask directly</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) send(input); }}>
              <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-3 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-sm">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type any question..."
                  className="flex-1 bg-transparent text-stone-900 text-[14px] placeholder-stone-300 outline-none" autoFocus />
                <button type="submit" disabled={!input.trim()}
                  className="w-8 h-8 rounded-lg bg-red-700 disabled:opacity-20 hover:bg-red-600 transition-all flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                </button>
              </div>
            </form>

            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="mt-3 text-stone-400 text-[13px] hover:text-stone-600 transition-colors">
                &larr; Back
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0 py-3 text-center border-t border-stone-100">
          <p className="text-stone-300 text-[10px]">Claude Sonnet 4 · ElevenLabs · Unbrowse · 16 floors · 700+ members</p>
        </div>
      </div>
    );
  }

  // ── CHAT ──
  const chatEmpty = msgs.length === 0;
  return (
    <div className="flex h-[100dvh] bg-[#fafaf9] text-stone-700 text-[14px] leading-relaxed overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-stone-200 bg-white px-3 py-4 gap-3 overflow-y-auto">
        <button onClick={() => { setMsgs([]); setScreen("welcome"); setStep(0); setInput(""); }}
          className="flex items-center gap-2.5 px-1 mb-2 group">
          <div className="w-7 h-7 rounded-lg bg-red-700 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
          </div>
          <span className="text-stone-900 text-sm font-bold group-hover:text-red-700 transition-colors">Frontier Tower</span>
        </button>

        <div>
          <p className="text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2 px-1">Floors</p>
          {FLOORS.map((f) => (
            <button key={f.n} onClick={() => send(`Tell me about Floor ${f.n}`)}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-stone-50 transition-colors text-left group">
              <span className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 bg-white border border-stone-200 group-hover:border-stone-300 transition-colors" style={{ color: f.c }}>{f.n}</span>
              <span className="text-stone-500 text-[13px] group-hover:text-stone-800 transition-colors truncate">{f.label}</span>
            </button>
          ))}
        </div>

        <div>
          <p className="text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2 px-1">Try asking</p>
          {["What's tonight?", "Laser cutter?", "Treasury funding?", "AI people?"].map((q) => (
            <button key={q} onClick={() => send(q)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-stone-400 text-[12px] hover:bg-stone-50 hover:text-stone-700 transition-colors">
              {q}
            </button>
          ))}
        </div>

        <div className="mt-auto mx-1 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-800 text-[11px] font-semibold">Hackathon Live</span>
          </div>
          <p className="text-emerald-600 text-[10px] mt-0.5">1,000+ visitors today</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-stone-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMsgs([]); setScreen("welcome"); setStep(0); setInput(""); }}
              className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center lg:hidden">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
            </button>
            <div>
              <h1 className="text-stone-900 font-bold text-[15px]">Frontier Tower Agent</h1>
              <p className="text-stone-400 text-[11px]">16 floors · 700+ members · San Francisco</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 text-[10px] font-semibold">Live</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-[#fafaf9]">
          {chatEmpty && !streaming && !loading ? (
            <div className="flex flex-col items-center justify-center h-full px-4 gap-4">
              <p className="text-stone-400 text-[14px]">Pick a question or type your own below</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {["What's tonight?", "Where's the laser cutter?", "How do treasuries work?", "Who should I meet?"].map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="px-3.5 py-2 rounded-lg bg-white border border-stone-200 text-stone-500 text-[13px] font-medium hover:border-red-300 hover:text-stone-800 hover:bg-red-50/40 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-5 space-y-5 max-w-2xl mx-auto w-full">
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-red-700 flex items-center justify-center">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
                    </div>
                  )}
                  <div className={`max-w-[85%] ${
                    m.role === "user"
                      ? "px-4 py-2.5 rounded-2xl rounded-br-sm bg-red-700 text-white"
                      : "text-stone-600"
                  }`}>
                    {m.role === "assistant" ? <Md text={m.content} /> : m.content}
                  </div>
                  {m.role === "assistant" && (
                    <button onClick={() => speak(m.content, i)} title={playingIdx === i ? "Stop" : "Listen"}
                      className={`shrink-0 self-start mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        playingIdx === i
                          ? "bg-red-100 border-2 border-red-400"
                          : "bg-white border border-stone-200 hover:border-red-300 hover:bg-red-50"
                      }`}>
                      {playingIdx === i ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#b91c1c"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#b91c1c" opacity="0.15"/><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#b91c1c" strokeWidth="1.5"/><path d="M15.54 8.46a5 5 0 010 7.07" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round"/><path d="M19.07 4.93a10 10 0 010 14.14" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/></svg>
                      )}
                    </button>
                  )}
                </div>
              ))}

              {(streaming || loading) && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-7 h-7 mt-0.5 rounded-lg bg-red-700 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                  {streaming ? (
                    <div className="text-stone-600 max-w-[85%]">
                      <Md text={streaming} />
                      <span className="inline-block w-[2px] h-4 bg-red-700 ml-0.5 align-middle animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex gap-1.5 items-center py-3">
                      {[0, 150, 300].map((d) => <div key={d} className="w-2 h-2 rounded-full bg-red-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  )}
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 sm:px-6 pb-4 pt-3 border-t border-stone-200 bg-white">
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }} className="max-w-2xl mx-auto">
            <div className={`flex items-end gap-2 bg-stone-50 border rounded-xl px-4 py-3 transition-all ${listening ? "border-red-500 ring-2 ring-red-100 bg-red-50/30" : "border-stone-200 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100"}`}>
              <textarea ref={ta} value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={listening ? "Listening... speak now" : "Ask anything about the Tower..."}
                rows={1} disabled={loading} autoFocus
                className="flex-1 bg-transparent text-stone-900 text-[14px] placeholder-stone-400 resize-none outline-none"
                style={{ minHeight: "24px", maxHeight: "100px" }}
              />
              {voiceSupported && (
                <button type="button" onClick={toggleVoice} disabled={loading}
                  className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    listening
                      ? "bg-red-600 animate-pulse shadow-md shadow-red-500/30"
                      : "bg-white border border-stone-200 hover:border-red-300 hover:bg-red-50"
                  }`}
                  title={listening ? "Stop listening" : "Speak your question"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={listening ? "white" : "#b91c1c"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              )}
              <button type="submit" disabled={!input.trim() || loading}
                className="shrink-0 w-9 h-9 rounded-lg bg-red-700 disabled:opacity-20 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
              </button>
            </div>
            <p className="text-center text-stone-300 text-[10px] mt-1.5">{voiceSupported ? "Tap the mic to speak · Tap the speaker icon on any response to hear it" : "Tap the speaker icon to hear any response read aloud"}</p>
          </form>
        </div>
      </div>
    </div>
  );
}
