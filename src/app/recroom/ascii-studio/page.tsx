// ═══════════════════════════════════════════════════════════════
// ASCII Studio — ASCII Art, Text Banners, and Animation
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useCallback } from "react";
import { Terminal, Type, Image } from "lucide-react";
import ActivityLayout from "@/components/recroom/ActivityLayout";
import PromptBuilder from "@/components/recroom/PromptBuilder";
import OutputViewer from "@/components/recroom/OutputViewer";
import SaveLoadManager from "@/components/recroom/SaveLoadManager";
import { REC_ROOM_ACTIVITIES, DEFAULT_ASCII_OPTIONS } from "@/types/recroom";
import type { EnhanceResponse, EnhancementOption, SavedItem, ASCIIMode } from "@/types/recroom";
import { EXAMPLE_PROMPTS } from "@/lib/recroom/prompt-templates";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = { Terminal, Zap: Terminal };
const activity = REC_ROOM_ACTIVITIES.find((a) => a.id === "ascii-studio")!;

const FONTS = ["slant", "doom", "big", "standard", "banner", "mini", "script", "shadow"];
const STYLES = ["classic", "dense", "sparse", "braille", "block"] as const;

export default function ASCIIStudioPage() {
  const [mode, setMode] = useState<ASCIIMode>("describe");
  const [prompt, setPrompt] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<EnhanceResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [output, setOutput] = useState("");
  const [font, setFont] = useState(DEFAULT_ASCII_OPTIONS.font);
  const [width, setWidth] = useState(DEFAULT_ASCII_OPTIONS.width);
  const [style, setStyle] = useState(DEFAULT_ASCII_OPTIONS.style);

  const callAPI = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/recroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    return d.data;
  }, []);

  const handleEnhance = useCallback(async (p: string) => {
    setPrompt(p);
    setEnhancing(true);
    setEnhancementResult(null);
    setOutput("");
    try {
      if (mode === "text-banner") {
        // Text banner: generate directly (no enhancement needed)
        const data = await callAPI({ action: "generate", activity: "ascii-studio", prompt: p, context: { font, width } });
        setOutput(data.output);
      } else {
        // Describe mode: enhance first
        const data = await callAPI({ action: "enhance", activity: "ascii-studio", prompt: p });
        setEnhancementResult(data);
      }
    } catch (error) {
      setOutput("Error: " + (error instanceof Error ? error.message : "Unknown"));
    } finally {
      setEnhancing(false);
    }
  }, [callAPI, mode, font, width]);

  const handleGenerate = useCallback(async (p: string, ctx?: Record<string, unknown>) => {
    setPrompt(p);
    setGenerating(true);
    setOutput("");
    try {
      const data = await callAPI({
        action: "generate",
        activity: "ascii-studio",
        prompt: p,
        context: { mode, font, width, style, ...(ctx || {}) },
      });
      setOutput(data.output);
    } catch (error) {
      setOutput("Error: " + (error instanceof Error ? error.message : "Unknown"));
    } finally {
      setGenerating(false);
    }
  }, [callAPI, mode, font, width, style]);

  const handleSelectOption = useCallback((option: EnhancementOption, index: number) => {
    setSelectedOption(index);
  }, []);

  const handleRefine = useCallback(async (refinement: string) => {
    if (!output) return;
    setRefining(true);
    try {
      const data = await callAPI({
        action: "refine",
        activity: "ascii-studio",
        prompt: prompt + "\n\nRefinement: " + refinement,
        context: { mode, font, width, style },
      });
      setOutput(data.output);
    } catch {} finally {
      setRefining(false);
    }
  }, [callAPI, output, prompt, mode, font, width, style]);

  const handleLoad = useCallback((item: SavedItem) => {
    setPrompt(item.prompt);
    setOutput(item.output);
  }, []);

  const modeTabs: { id: ASCIIMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "describe", label: "Describe", icon: Type },
    { id: "text-banner", label: "Text Banner", icon: Terminal },
  ];

  return (
    <ActivityLayout activity={activity} iconMap={iconMap}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-dark-900/50 border border-white/10">
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-mono transition-colors ${
                  mode === tab.id
                    ? "bg-green-500/10 border border-green-500/20 text-neon-green"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>

          <PromptBuilder
            accentColor="green"
            placeholder={
              mode === "text-banner"
                ? "Text for your banner..."
                : mode === "upload"
                ? "Describe how to style the conversion..."
                : "Describe your ASCII art..."
            }
            examples={EXAMPLE_PROMPTS["ascii-studio"]}
            onEnhance={handleEnhance}
            onGenerate={handleGenerate}
            onSelectOption={handleSelectOption}
            enhancing={enhancing}
            generating={generating}
            enhancementResult={enhancementResult}
            selectedOption={selectedOption}
          >
            {/* Advanced options */}
            <div className="space-y-3 p-3 rounded-lg bg-dark-800/30 border border-white/5">
              {mode === "text-banner" && (
                <div>
                  <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">
                    Font
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {FONTS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFont(f)}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                          font === f
                            ? "border-green-500/30 bg-green-500/10 text-neon-green"
                            : "border-white/10 text-white/30 hover:text-white/50"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">
                  Style
                </label>
                <div className="flex flex-wrap gap-1">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                        style === s
                          ? "border-green-500/30 bg-green-500/10 text-neon-green"
                          : "border-white/10 text-white/30 hover:text-white/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">
                  Width: {width} chars
                </label>
                <input
                  type="range"
                  min={40}
                  max={120}
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
              </div>
            </div>
          </PromptBuilder>

          <SaveLoadManager
            activity="ascii-studio"
            accentColor="green"
            currentOutput={output}
            currentPrompt={prompt}
            currentEnhancedPrompt={null}
            outputFormat="text"
            metadata={{ mode, font, width, style }}
            onLoad={handleLoad}
          />
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-3">
          <OutputViewer
            format="text"
            content={output}
            accentColor="green"
            onRefine={handleRefine}
            showRefine={!!output}
            refining={refining}
          />
        </div>
      </div>
    </ActivityLayout>
  );
}
