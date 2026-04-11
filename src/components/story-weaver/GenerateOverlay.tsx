// GenerateOverlay — Loading overlay with smooth progress bar and fun messages
"use client";
import { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { LOADING_MESSAGES } from "@/lib/story-weaver/prompts";

interface GenerateOverlayProps {
  title: string;
  visible: boolean;
  onComplete?: () => void;
}

export default function GenerateOverlay({ title, visible, onComplete }: GenerateOverlayProps) {
  const [msg, setMsg] = useState(LOADING_MESSAGES[0]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"generating" | "complete">("generating");
  const startTimeRef = useRef(Date.now());
  const msgIndexRef = useRef(0);

  // Reset on visibility change
  useEffect(() => {
    if (visible) {
      setProgress(0);
      setPhase("generating");
      startTimeRef.current = Date.now();
      msgIndexRef.current = 0;
    }
  }, [visible]);

  // Message rotation — 6 seconds per message
  useEffect(() => {
    if (!visible || phase !== "generating") return;
    const interval = setInterval(() => {
      msgIndexRef.current = (msgIndexRef.current + 1) % LOADING_MESSAGES.length;
      setMsg(LOADING_MESSAGES[msgIndexRef.current]);
    }, 6000);
    return () => clearInterval(interval);
  }, [visible, phase]);

  // Smooth progress bar with random noise
  useEffect(() => {
    if (!visible || phase !== "generating") return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const target = Math.min(80, (elapsed / 30000) * 80);
      const noise = (Math.random() - 0.5) * 3;
      setProgress((prev) => Math.min(85, Math.max(prev, target + noise)));
    }, 250);
    return () => clearInterval(interval);
  }, [visible, phase]);

  // Called by parent when generation is complete
  useEffect(() => {
    if (phase === "complete" && onComplete) {
      setProgress(100);
      const timeout = setTimeout(onComplete, 1500);
      return () => clearTimeout(timeout);
    }
  }, [phase, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-sm">
      <div className="rounded-2xl border border-purple-500/20 bg-dark-900/80 p-10 text-center max-w-md w-full mx-4">
        {phase === "generating" ? (
          <>
            <Sparkles className="w-12 h-12 text-neon-purple animate-pulse mx-auto mb-6" />
            <h2 className="text-xl font-serif text-white mb-1">{title || "Your Story"}</h2>
            <p className="text-sm text-white/40 mb-6 h-5 transition-opacity">{msg}</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-6" />
            <h2 className="text-xl font-serif text-white mb-1">{title || "Your Story"}</h2>
            <p className="text-sm text-neon-green mb-6">Ready to read!</p>
          </>
        )}

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-white/5 mb-6 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${
            phase === "complete" ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-purple-500 to-purple-400"
          }`} style={{ width: `${progress}%` }} />
        </div>

        <p className="text-[10px] font-mono text-white/20">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}
