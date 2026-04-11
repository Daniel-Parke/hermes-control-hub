// Story Weaver — Create Story
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles, Plus, X } from "lucide-react";
import { STORY_TEMPLATES } from "@/types/recroom";
import type { StoryCharacter } from "@/types/recroom";
import GenerateOverlay from "@/components/story-weaver/GenerateOverlay";

const DEFAULT_GENRES = ["Sci-Fi", "Mystery", "Fantasy", "Romance", "Crime", "Horror", "Adventure", "Historical"];
const DEFAULT_ERAS = ["Ancient", "Medieval", "Modern", "Near Future", "Far Future", "Timeless"];
const DEFAULT_MOODS = ["Tense", "Wonder", "Humorous", "Dark", "Hopeful", "Melancholy", "Suspenseful", "Whimsical"];
const DEFAULT_SETTINGS = ["Space Station", "Medieval Castle", "Modern City", "Underwater", "Forest", "Desert", "Island", "Train"];

function Tags({ label, options, selected, onToggle, onAdd }: {
  label: string; options: string[]; selected: string[];
  onToggle: (t: string) => void; onAdd: (t: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");
  return (
    <div>
      <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((t) => (
          <button key={t} onClick={() => onToggle(t)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all ${
              selected.includes(t) ? "border-purple-500/40 bg-purple-500/15 text-neon-purple" : "border-white/8 text-white/30 hover:text-white/50"
            }`}>{t}</button>
        ))}
        {adding ? (
          <div className="flex items-center gap-1">
            <input value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); setAdding(false); } if (e.key === "Escape") setAdding(false); }}
              className="w-24 bg-dark-800/50 border border-purple-500/30 rounded px-2 py-1 text-[10px] font-mono text-white outline-none" autoFocus placeholder="Custom..." />
            <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); setAdding(false); } }} className="p-0.5 text-neon-purple"><Plus className="w-3 h-3" /></button>
            <button onClick={() => setAdding(false)} className="p-0.5 text-white/30"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="px-2 py-1 rounded-md text-[10px] font-mono border border-dashed border-white/10 text-white/20 hover:text-white/40">+ Add</button>
        )}
      </div>
    </div>
  );
}

export default function CreateStoryPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genDone, setGenDone] = useState(false);
  const [genStoryId, setGenStoryId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [premise, setPremise] = useState(STORY_TEMPLATES[0].premise);
  const [genres, setGenres] = useState<string[]>([...STORY_TEMPLATES[0].genre]);
  const [era, setEra] = useState(STORY_TEMPLATES[0].era);
  const [moods, setMoods] = useState<string[]>([...STORY_TEMPLATES[0].moods]);
  const [setting, setSetting] = useState(STORY_TEMPLATES[0].setting);
  const [pov, setPov] = useState<string>(STORY_TEMPLATES[0].pov);
  const [length, setLength] = useState<string>(STORY_TEMPLATES[0].length);
  const [wordCountRange, setWordCountRange] = useState("standard");
  const [characters, setCharacters] = useState<StoryCharacter[]>([...STORY_TEMPLATES[0].characters]);
  const [selectedTemplate, setSelectedTemplate] = useState("cosmic-voyager");
  const [genreOpts, setGenreOpts] = useState([...DEFAULT_GENRES]);
  const [eraOpts, setEraOpts] = useState([...DEFAULT_ERAS]);
  const [moodOpts, setMoodOpts] = useState([...DEFAULT_MOODS]);
  const [settingOpts, setSettingOpts] = useState([...DEFAULT_SETTINGS]);

  const applyTemplate = (id: string) => {
    setSelectedTemplate(id);
    const t = STORY_TEMPLATES.find((tmpl) => tmpl.id === id);
    if (!t) return;
    setPremise(t.premise); setGenres([...t.genre]); setEra(t.era); setMoods([...t.moods]);
    setSetting(t.setting); setPov(t.pov); setLength(t.length); setCharacters([...t.characters]);
    // Only set title if user hasn't manually edited it
    if (!titleManuallyEdited) setTitle(t.name);
  };

  const toggle = (list: string[], set: (v: string[]) => void, tag: string) =>
    set(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  const addOpt = (opts: string[], set: (v: string[]) => void, tag: string) =>
    { if (!opts.includes(tag)) set([...opts, tag]); };

  const handleCreate = useCallback(async () => {
    if (!premise.trim()) return;
    setGenerating(true);
    setGenDone(false);
    setGenStoryId(null);

    try {
      const res = await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title || "Untitled Story",
          config: { title: title || "Untitled Story", premise, genre: genres.join(", "), era, setting, mood: moods, pov, length, characters, wordCountRange },
        }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);

      // Signal done — overlay will animate to 100%, show success, then navigate
      setGenStoryId(d.data.id);
      setGenDone(true);
    } catch (err) {
      setGenerating(false);
      alert("Failed to create story: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }, [title, premise, genres, era, setting, moods, pov, length, characters]);

  const handleGenComplete = useCallback(() => {
    if (genStoryId) {
      router.push("/recroom/story-weaver/" + genStoryId);
    }
  }, [genStoryId, router]);

  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines">
      {/* Generate overlay */}
      <GenerateOverlay title={title || "Your Story"} visible={generating} done={genDone} onComplete={handleGenComplete} />

      {/* Header */}
      <div className="border-b border-white/10 bg-dark-900/50 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/recroom/story-weaver")} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5"><ChevronLeft className="w-4 h-4" /></button>
          <Sparkles className="w-5 h-5 text-neon-purple" />
          <h1 className="text-lg font-bold text-white">Create Story</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="rounded-xl border border-purple-500/20 bg-dark-900/50 p-5">
          <label className="text-xs font-mono text-white/40 uppercase tracking-widest block mb-2">Story Title</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); setTitleManuallyEdited(true); }} placeholder="Give your story a name..."
            className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-lg text-white placeholder-white/20 outline-none focus:border-purple-500/30 font-serif font-semibold" />
        </div>

        {/* Templates */}
        <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5">
          <label className="text-xs font-mono text-white/40 uppercase tracking-widest block mb-3">Quick Start — Templates</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STORY_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t.id)}
                className={`text-left p-3 rounded-lg border transition-all ${selectedTemplate === t.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-white/[0.02] hover:border-white/15"}`}>
                <div className="text-xs font-semibold text-white/80 mb-0.5">{t.name}</div>
                <div className="text-[9px] font-mono text-white/30">{t.genre.join(", ")}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Premise */}
        <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5">
          <label className="text-xs font-mono text-white/40 uppercase tracking-widest block mb-2">What's your story about?</label>
          <textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={4}
            className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/30 font-mono resize-none leading-relaxed" placeholder="Describe your story concept..." />
        </div>

        {/* Tags */}
        <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5 space-y-4">
          <Tags label="Genre" options={genreOpts} selected={genres} onToggle={(t) => toggle(genres, setGenres, t)} onAdd={(t) => addOpt(genreOpts, setGenreOpts, t)} />
          <Tags label="Era" options={eraOpts} selected={[era]} onToggle={(t) => setEra(t === era ? "" : t)} onAdd={(t) => addOpt(eraOpts, setEraOpts, t)} />
          <Tags label="Mood" options={moodOpts} selected={moods} onToggle={(t) => toggle(moods, setMoods, t)} onAdd={(t) => addOpt(moodOpts, setMoodOpts, t)} />
          <Tags label="Setting" options={settingOpts} selected={[setting]} onToggle={(t) => setSetting(t === setting ? "" : t)} onAdd={(t) => addOpt(settingOpts, setSettingOpts, t)} />
        </div>

        {/* Characters */}
        <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Characters</label>
            <button onClick={() => setCharacters((p) => [...p, { name: "", role: "supporting", description: "" }])}
              className="text-[10px] font-mono text-neon-purple flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
          </div>
          <div className="space-y-2">
            {characters.map((ch, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input value={ch.name} onChange={(e) => setCharacters((p) => p.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                  placeholder="Name" className="flex-1 bg-dark-800/50 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none font-mono" />
                <select value={ch.role} onChange={(e) => setCharacters((p) => p.map((c, j) => j === i ? { ...c, role: e.target.value as StoryCharacter["role"] } : c))}
                  className="bg-dark-800/50 border border-white/8 rounded-lg px-2 py-2 text-xs text-white outline-none font-mono w-28">
                  {["protagonist", "ally", "antagonist", "supporting", "mystery"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input value={ch.description} onChange={(e) => setCharacters((p) => p.map((c, j) => j === i ? { ...c, description: e.target.value } : c))}
                  placeholder="Description" className="flex-[2] bg-dark-800/50 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none font-mono" />
                <button onClick={() => setCharacters((p) => p.filter((_, j) => j !== i))} className="p-2 text-white/20 hover:text-red-400"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* POV + Length */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/8 bg-dark-900/50 p-4">
            <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Point of View</label>
            <select value={pov} onChange={(e) => setPov(e.target.value)}
              className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono">
              <option value="first">First Person</option>
              <option value="third-limited">Third Person Limited</option>
              <option value="third-omniscient">Third Person Omniscient</option>
            </select>
          </div>
          <div className="rounded-xl border border-white/8 bg-dark-900/50 p-4">
            <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Length</label>
            <select value={length} onChange={(e) => setLength(e.target.value)}
              className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono">
              <option value="short">Short (3-4 chapters)</option>
              <option value="medium">Medium (5-7 chapters)</option>
              <option value="long">Long (8-12 chapters)</option>
            </select>
          </div>
        </div>

        {/* Chapter Word Count */}
        <div className="rounded-xl border border-white/8 bg-dark-900/50 p-4">
          <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Chapter Length (words per chapter)</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "short", label: "800-1.2k" },
              { id: "medium", label: "1.2-1.8k" },
              { id: "standard", label: "1.8-2.5k" },
              { id: "long", label: "2.5-3.5k" },
              { id: "epic", label: "3.5-5k" },
              { id: "marathon", label: "5k+" },
            ].map((opt) => (
              <button key={opt.id} onClick={() => setWordCountRange(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                  wordCountRange === opt.id ? "border-purple-500/40 bg-purple-500/15 text-neon-purple" : "border-white/8 text-white/30 hover:text-white/50"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button onClick={handleCreate} disabled={!premise.trim() || generating}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-base font-mono text-neon-purple hover:bg-purple-500/20 transition-all disabled:opacity-30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
          <Sparkles className="w-5 h-5" /> Begin Writing
        </button>
      </div>
    </div>
  );
}
