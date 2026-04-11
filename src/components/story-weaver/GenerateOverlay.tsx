// GenerateOverlay — Loading overlay during story generation
"use client";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { LOADING_MESSAGES } from "@/lib/story-weaver/prompts";

interface GenerateOverlayProps {
  title: string;
  phase: string; // "plan", "chapter1", "chapter2", etc.
  chapters: { number: number; status: string }[];
  visible: boolean;
}

export default function GenerateOverlay({ title, phase, chapters, visible }: GenerateOverlayProps) {
  const [msg, setMsg] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 3500);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-sm">
      <div className="rounded-2xl border border-purple-500/20 bg-dark-900/80 p-10 text-center max-w-md w-full mx-4">
        <Sparkles className="w-12 h-12 text-neon-purple animate-pulse mx-auto mb-6" />
        <h2 className="text-xl font-serif text-white mb-1">{title || "Your Story"}</h2>
        <p className="text-sm text-white/40 mb-6 animate-pulse">{msg}</p>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-white/5 mb-4 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-1000"
            style={{ width: `${Math.min(90, (chapters.filter(c => c.status === "complete").length / Math.max(1, chapters.length)) * 100)}%` }} />
        </div>

        {/* Chapter status */}
        <div className="space-y-1 text-xs font-mono text-left">
          <div className="flex items-center gap-2">
            <span className={chapters[0]?.status === "complete" ? "text-neon-green" : "text-neon-purple"}>
              {chapters[0]?.status === "complete" ? "✓" : "⏳"}
            </span>
            <span className="text-white/50">Story Plan + Chapter 1</span>
          </div>
          {chapters.slice(1).map((ch) => (
            <div key={ch.number} className="flex items-center gap-2">
              <span className={ch.status === "complete" ? "text-neon-green" : "text-white/20"}>
                {ch.status === "complete" ? "✓" : "○"}
              </span>
              <span className="text-white/30">Chapter {ch.number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
