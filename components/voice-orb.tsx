"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type OrbState = "idle" | "listening" | "thinking" | "talking";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;

interface VoiceOrbProps {
  onClose: () => void;
}

export default function VoiceOrb({ onClose }: VoiceOrbProps) {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SR>(null);
  const orbStateRef = useRef<OrbState>("idle");
  const timeRef = useRef(0);

  // keep ref in sync
  useEffect(() => { orbStateRef.current = orbState; }, [orbState]);

  // ── Canvas orb animation ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.55;
      canvas!.width = size;
      canvas!.height = size;
    }
    resize();
    window.addEventListener("resize", resize);

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      const cx = w / 2;
      const cy = h / 2;
      const state = orbStateRef.current;
      timeRef.current += 0.018;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      // Base radius
      const baseR = w * 0.36;

      // Speed & amplitude by state
      const speed   = state === "talking" ? 3.2 : state === "listening" ? 2.0 : state === "thinking" ? 1.4 : 0.6;
      const amp     = state === "talking" ? 0.18 : state === "listening" ? 0.12 : state === "thinking" ? 0.08 : 0.04;
      const points  = 7;

      // Colors by state
      const colors: Record<OrbState, [string, string, string]> = {
        idle:      ["#fca5a5", "#b91c1c", "#7f1d1d"],
        listening: ["#fdba74", "#dc2626", "#b91c1c"],
        thinking:  ["#c4b5fd", "#7c3aed", "#4c1d95"],
        talking:   ["#6ee7b7", "#b91c1c", "#dc2626"],
      };
      const [c1, c2, c3] = colors[state];

      // Draw blob
      ctx.beginPath();
      for (let i = 0; i <= points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2;
        const noise =
          Math.sin(angle * 3 + t * speed) * amp +
          Math.sin(angle * 5 - t * speed * 0.7) * amp * 0.6 +
          Math.sin(angle * 7 + t * speed * 0.4) * amp * 0.3;
        const r = baseR * (1 + noise);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Gradient fill
      const grad = ctx.createRadialGradient(cx - baseR * 0.2, cy - baseR * 0.2, 0, cx, cy, baseR * 1.2);
      grad.addColorStop(0, c1);
      grad.addColorStop(0.5, c2);
      grad.addColorStop(1, c3);
      ctx.fillStyle = grad;
      ctx.shadowColor = c2;
      ctx.shadowBlur = state === "talking" ? 60 : state === "listening" ? 40 : 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner glow ring
      const ring = ctx.createRadialGradient(cx, cy, baseR * 0.7, cx, cy, baseR * 1.1);
      ring.addColorStop(0, "rgba(255,255,255,0)");
      ring.addColorStop(1, "rgba(255,255,255,0.07)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Pulse rings when talking
      if (state === "talking" || state === "listening") {
        const pulse = (Math.sin(t * (state === "talking" ? 4 : 2.5)) + 1) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * lerp(1.1, 1.45, pulse), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(185,28,28,${lerp(0.3, 0, pulse)})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, baseR * lerp(1.2, 1.7, pulse), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(185,28,28,${lerp(0.15, 0, pulse)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  // ── Speak response via ElevenLabs ──
  const speak = useCallback(async (text: string) => {
    if (audioEl.current) { audioEl.current.pause(); audioEl.current = null; }
    setOrbState("talking");
    try {
      const r = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 800) }),
      });
      if (!r.ok) { setOrbState("idle"); return; }
      const a = new Audio(URL.createObjectURL(await r.blob()));
      audioEl.current = a;
      a.onended = () => { setOrbState("idle"); startListening(); };
      a.onerror = () => { setOrbState("idle"); };
      await a.play();
    } catch { setOrbState("idle"); }
  }, []);

  // ── Send to Claude ──
  const sendToAgent = useCallback(async (userText: string, history: { role: "user" | "assistant"; content: string }[]) => {
    setOrbState("thinking");
    setResponse("");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!r.ok || !r.body) { setOrbState("idle"); return; }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setResponse(full);
      }
      setMsgs(prev => [...prev, { role: "assistant", content: full }]);
      await speak(full);
    } catch { setOrbState("idle"); }
  }, [speak]);

  // ── Voice input ──
  const startListening = useCallback(() => {
    const SRCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRCtor) return;
    const rec = new SRCtor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    recognitionRef.current = rec;
    setOrbState("listening");
    setTranscript("");

    let final = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final + interim);
    };
    rec.onend = () => {
      if (final.trim()) {
        setTranscript(final.trim());
        const userMsg = { role: "user" as const, content: final.trim() };
        setMsgs(prev => {
          const next = [...prev, userMsg];
          sendToAgent(final.trim(), next);
          return next;
        });
      } else {
        setOrbState("idle");
      }
    };
    rec.onerror = () => setOrbState("idle");
    rec.start();
  }, [sendToAgent]);

  function stopAll() {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    if (audioEl.current) { audioEl.current.pause(); audioEl.current = null; }
    setOrbState("idle");
  }

  function handleOrbTap() {
    if (orbState === "talking") { stopAll(); return; }
    if (orbState === "listening") { if (recognitionRef.current) recognitionRef.current.stop(); return; }
    if (orbState === "idle") { startListening(); }
  }

  const stateLabel: Record<OrbState, string> = {
    idle: "Tap to speak",
    listening: "Listening...",
    thinking: "Thinking...",
    talking: "Tap to stop",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0a09]">
      {/* Close */}
      <button onClick={() => { stopAll(); onClose(); }}
        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      {/* Header */}
      <div className="absolute top-5 left-5 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-red-700 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg>
        </div>
        <span className="text-white/60 text-[13px] font-medium">Frontier Tower Agent</span>
      </div>

      {/* Orb */}
      <button onClick={handleOrbTap} className="relative flex items-center justify-center cursor-pointer select-none">
        <canvas ref={canvasRef} className="rounded-full" />
      </button>

      {/* State label */}
      <p className="mt-6 text-white/50 text-[13px] tracking-wide font-medium transition-all">
        {stateLabel[orbState]}
      </p>

      {/* Transcript / response */}
      <div className="mt-4 px-8 max-w-sm text-center min-h-[60px]">
        {transcript && orbState === "listening" && (
          <p className="text-white/80 text-[14px] leading-relaxed">{transcript}</p>
        )}
        {response && (orbState === "thinking" || orbState === "talking") && (
          <p className="text-white/70 text-[13px] leading-relaxed line-clamp-3">{response}</p>
        )}
      </div>

      {/* Hint */}
      <p className="absolute bottom-6 text-white/20 text-[11px]">
        Voice · ElevenLabs · Claude Sonnet 4
      </p>
    </div>
  );
}
