// ═══════════════════════════════════════════════════════════════
// PromptBuilder — Universal prompt input for all Rec Room activities
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState } from "react";
import { Sparkles, Wand2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import type { EnhanceResponse, EnhancementOption } from "@/types/recroom";
import type { AccentColor } from "@/types/hermes";

interface PromptBuilderProps {
  accentColor: AccentColor;
  placeholder: string;
  examples: string[];
  onEnhance: (prompt: string) => void;
  onGenerate: (prompt: string, context?: Record<string, unknown>) => void;
  onSelectOption: (option: EnhancementOption, index: number) => void;
  enhancing: boolean;
  generating: boolean;
  enhancementResult: EnhanceResponse | null;
  selectedOption: number | null;
  children?: React.ReactNode; // For activity-specific advanced options
}

const accentButtons: Record<AccentColor, string> = {
  cyan: "bg-cyan-500/10 border-cyan-500/30 text-neon-cyan hover:bg-cyan-500/20",
  purple: "bg-purple-500/10 border-purple-500/30 text-neon-purple hover:bg-purple-500/20",
  green: "bg-green-500/10 border-green-500/30 text-neon-green hover:bg-green-500/20",
  pink: "bg-pink-500/10 border-pink-500/30 text-neon-pink hover:bg-pink-500/20",
  orange: "bg-orange-500/10 border-orange-500/30 text-neon-orange hover:bg-orange-500/20",
};

export default function PromptBuilder({
  accentColor,
  placeholder,
  examples,
  onEnhance,
  onGenerate,
  onSelectOption,
  enhancing,
  generating,
  enhancementResult,
  selectedOption,
  children,
}: PromptBuilderProps) {
  const [prompt, setPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const busy = enhancing || generating;
  const btnClass = accentButtons[accentColor] || accentButtons.cyan;

  const handleEnhance = () => {
    if (!prompt.trim() || busy) return;
    onEnhance(prompt.trim());
  };

  const handleDirectGenerate = () => {
    if (!prompt.trim() || busy) return;
    onGenerate(prompt.trim());
  };

  const handleOptionSelect = (index: number) => {
    if (!enhancementResult || busy) return;
    const option = enhancementResult.options[index];
    onSelectOption(option, index);
    // Populate the prompt input with the enhanced interpretation
    // User must click Create to generate
  };

  const handleReset = () => {
    setPrompt("");
  };

  return (
    <div className="space-y-4">
      {/* Prompt input */}
      <div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 font-mono resize-none"
          disabled={busy}
        />
      </div>

      {/* Action buttons — Enhance and Create are separate */}
      <div className="flex gap-2">
        <button
          onClick={handleEnhance}
          disabled={!prompt.trim() || busy}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-mono transition-colors disabled:opacity-30 ${btnClass}`}
        >
          {enhancing ? (
            <Sparkles className="w-4 h-4 animate-pulse" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {enhancing ? "Enhancing..." : "Enhance"}
        </button>
        <button
          onClick={handleDirectGenerate}
          disabled={!prompt.trim() || busy}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-mono transition-colors disabled:opacity-30 ${btnClass}`}
        >
          {generating ? (
            <Sparkles className="w-4 h-4 animate-pulse" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? "Creating..." : "Create"}
        </button>
        {prompt && (
          <button
            onClick={handleReset}
            disabled={busy}
            className="p-2.5 rounded-lg border border-white/10 text-white/30 hover:text-white/50 hover:bg-white/5 transition-colors disabled:opacity-30"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Enhancement result */}
      {enhancementResult && (
        <div className="rounded-lg border border-white/10 bg-dark-800/30 p-4 space-y-3">
          <p className="text-xs text-white/50 font-mono">{enhancementResult.interpretation}</p>

          {enhancementResult.techniques.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {enhancementResult.techniques.map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/30"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Choose an approach, then click Create</div>
            {enhancementResult.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleOptionSelect(i)}
                disabled={busy}
                className={`w-full text-left p-3 rounded-lg border transition-colors disabled:opacity-30 ${
                  selectedOption === i
                    ? "border-white/30 bg-white/10"
                    : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <div className="text-xs font-semibold text-white/80">{opt.label}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generating indicator */}
      {generating && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Sparkles className="w-4 h-4 animate-pulse text-white/40" />
          <span className="text-xs font-mono text-white/40">Creating your experience...</span>
        </div>
      )}

      {/* Advanced options (activity-specific) */}
      {children && (
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[10px] font-mono text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced Options
          </button>
          {showAdvanced && <div className="mt-2">{children}</div>}
        </div>
      )}

      {/* Example prompts */}
      <div className="flex flex-wrap gap-1.5">
        {examples.slice(0, 4).map((ex, i) => (
          <button
            key={i}
            onClick={() => setPrompt(ex)}
            disabled={busy}
            className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 text-white/25 hover:text-white/50 hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            {ex.length > 40 ? ex.slice(0, 40) + "..." : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
