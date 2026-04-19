"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw, ChevronDown } from "lucide-react";

interface IntervalSelectorProps {
  value: string;
  onChange: (interval: string) => void;
  compact?: boolean;
}

const PRESETS = [
  { value: "1m", label: "1 minute" },
  { value: "5m", label: "5 minutes" },
  { value: "10m", label: "10 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "2h", label: "2 hours" },
  { value: "4h", label: "4 hours" },
  { value: "8h", label: "8 hours" },
  { value: "12h", label: "12 hours" },
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
];

function getIntervalLabel(value: string): string {
  // Strip "every " prefix — API returns schedule values like "every 5m"
  const stripped = value.replace(/^every\s+/i, "");
  const preset = PRESETS.find((p) => p.value === stripped);
  return preset ? preset.label : stripped;
}

export default function IntervalSelector({ value, onChange, compact = false }: IntervalSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (compact) {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/60 hover:border-neon-cyan/50 hover:text-neon-cyan transition-colors relative"
        title={`Interval: every ${getIntervalLabel(value)}`}
      >
        <RefreshCw className="w-3 h-3" />
        {value}
        {open && (
          <div ref={ref} className="absolute top-full left-0 mt-1 z-50 w-40 bg-dark-900 border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={(e) => { e.stopPropagation(); onChange(`every ${p.value}`); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${value === `every ${p.value}` || value === p.value ? "text-neon-cyan" : "text-white/60"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:border-white/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-neon-cyan" />
          <div className="text-left">
            <div className="font-medium text-sm">Every {getIntervalLabel(value)}</div>
            <div className="text-[10px] text-white/30">Repeat frequency</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-dark-900 border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => { onChange(`every ${p.value}`); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 ${value === `every ${p.value}` || value === p.value ? "text-neon-cyan bg-neon-cyan/5" : "text-white/70"}`}
            >
              Every {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
