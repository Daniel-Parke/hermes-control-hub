// SteerInput — Narrative direction input
"use client";
import { useState } from "react";
import { Wand2 } from "lucide-react";

export default function SteerInput({ onSteer, disabled, loading }: {
  onSteer: (direction: string) => void; disabled?: boolean; loading?: boolean;
}) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim() && !loading) {
      onSteer(text.trim());
      setText("");
    }
  };

  return (
    <div className="rounded-xl border border-white/5 p-4" style={{ background: "#141210" }}>
      <label className="text-[10px] font-mono text-white/25 uppercase tracking-wider block mb-2">
        What happens next?
      </label>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Something unexpected happens..."
          className="flex-1 bg-dark-800/50 border border-white/8 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/15 outline-none focus:border-purple-500/30 font-mono"
          disabled={disabled || loading}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
        <button onClick={handleSubmit} disabled={!text.trim() || loading || disabled}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-purple-500/30 text-xs font-mono text-neon-purple hover:bg-purple-500/10 disabled:opacity-30 transition-colors">
          <Wand2 className="w-3 h-3" /> Apply
        </button>
      </div>
    </div>
  );
}
