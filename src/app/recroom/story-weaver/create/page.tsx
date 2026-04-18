// Story Weaver — Create Story V3 (creative workshop: themes, characters, story details)
"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Sparkles, Plus, X, Save, FolderOpen, Users, Trash2 } from "lucide-react";
import { STORY_TEMPLATES } from "@/types/recroom";
import type { StoryCharacter, CharacterSheet, StoryTheme } from "@/types/recroom";
import GenerateOverlay from "@/components/story-weaver/GenerateOverlay";

const DEFAULT_GENRES = ["Sci-Fi", "Mystery", "Fantasy", "Romance", "Crime", "Horror", "Adventure", "Historical"];
const DEFAULT_ERAS = ["Ancient", "Medieval", "Modern", "Near Future", "Far Future", "Timeless"];
const DEFAULT_MOODS = ["Tense", "Wonder", "Humorous", "Dark", "Hopeful", "Melancholy", "Suspenseful", "Whimsical"];
const DEFAULT_SETTINGS = ["Space Station", "Medieval Castle", "Modern City", "Underwater", "Forest", "Desert", "Island", "Train"];
const DRAFT_KEY = "story-weaver-draft";
const ROLES = ["protagonist", "ally", "antagonist", "supporting", "mystery"];

const EMPTY_CHARACTER: StoryCharacter = { name: "", role: "supporting", description: "" };

interface Draft {
  title: string;
  premise: string;
  genres: string[];
  era: string;
  moods: string[];
  setting: string;
  pov: string;
  length: string;
  wordCountRange: string;
  characters: StoryCharacter[];
  savedAt: string;
}

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
              selected.includes(t) ? "border-green-500/40 bg-green-500/15 text-green-400" : "border-white/8 text-white/30 hover:text-white/50"
            }`}>{t}</button>
        ))}
        {adding ? (
          <div className="flex items-center gap-1">
            <input value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); setAdding(false); } if (e.key === "Escape") setAdding(false); }}
              className="w-24 bg-dark-800/50 border border-green-500/30 rounded px-2 py-1 text-[10px] font-mono text-white outline-none" autoFocus placeholder="Custom..." />
            <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); setAdding(false); } }} className="p-0.5 text-green-400"><Plus className="w-3 h-3" /></button>
            <button onClick={() => setAdding(false)} className="p-0.5 text-white/30"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="px-2 py-1 rounded-md text-[10px] font-mono border border-dashed border-white/10 text-white/20 hover:text-white/40">+ Add</button>
        )}
      </div>
    </div>
  );
}

function CharacterCard({ char, index, onUpdate, onRemove, onSave, expanded, onToggle }: {
  char: StoryCharacter;
  index: number;
  onUpdate: (idx: number, field: keyof StoryCharacter, value: string) => void;
  onRemove: (idx: number) => void;
  onSave: (char: StoryCharacter) => void;
  expanded: boolean;
  onToggle: (idx: number) => void;
}) {
  const canSave = char.name.trim() && char.description.trim();
  return (
    <div className="rounded-lg border border-white/5 bg-dark-800/30 overflow-hidden">
      <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/[0.02]" onClick={() => onToggle(index)}>
        <input value={char.name} onChange={(e) => { e.stopPropagation(); onUpdate(index, "name", e.target.value); }}
          onClick={(e) => e.stopPropagation()} placeholder="Character name"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none font-semibold" />
        <select value={char.role} onChange={(e) => { e.stopPropagation(); onUpdate(index, "role", e.target.value); }}
          onClick={(e) => e.stopPropagation()}
          className="bg-dark-700/50 border border-white/8 rounded px-2 py-1 text-[10px] text-white/70 outline-none font-mono w-28">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {expanded && (
          <button onClick={(e) => { e.stopPropagation(); onSave(char); }} disabled={!canSave}
            className="p-1 text-white/20 hover:text-green-400 disabled:opacity-30" title="Save to library">
            <Save className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="p-1 text-white/20 hover:text-red-400">
          <X className="w-3.5 h-3.5" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </div>
      <div className="px-3 pb-2 -mt-1">
        <input value={char.description} onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="Short description..."
          className="w-full bg-transparent text-xs text-white/50 placeholder-white/15 outline-none" />
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-3">
          {[
            { field: "personality" as const, label: "Personality Traits", ph: "e.g., Pragmatic, Protective, Stubborn" },
            { field: "appearance" as const, label: "Appearance", ph: "Physical description — build, features, distinguishing marks..." },
            { field: "backstory" as const, label: "Backstory", ph: "Their history, motivations, what drives them..." },
            { field: "speechPatterns" as const, label: "Speech Patterns", ph: "How they talk — formal, slang, accent, verbal tics..." },
            { field: "relationships" as const, label: "Relationships", ph: "Connections to other characters — allies, enemies, bonds..." },
          ].map(({ field, label, ph }) => (
            <div key={field}>
              <label className="text-[10px] font-mono text-white/25 uppercase block mb-1">{label}</label>
              <textarea value={char[field] || ""} onChange={(e) => onUpdate(index, field, e.target.value)}
                rows={2} placeholder={ph}
                className="w-full bg-dark-700/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white/70 placeholder-white/15 outline-none font-mono resize-none leading-relaxed" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateStoryPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-950 flex items-center justify-center"><Sparkles className="w-8 h-8 text-neon-purple animate-spin" /></div>}>
      <CreateStoryPage />
    </Suspense>
  );
}

function CreateStoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [generating, setGenerating] = useState(false);
  const [genDone, setGenDone] = useState(false);
  const [genStoryId, setGenStoryId] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

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
  const [selectedTheme, setSelectedTheme] = useState("cosmic-voyager");
  const [expandedChars, setExpandedChars] = useState<Record<number, boolean>>({});
  const [genreOpts, setGenreOpts] = useState([...DEFAULT_GENRES]);
  const [eraOpts, setEraOpts] = useState([...DEFAULT_ERAS]);
  const [moodOpts, setMoodOpts] = useState([...DEFAULT_MOODS]);
  const [settingOpts, setSettingOpts] = useState([...DEFAULT_SETTINGS]);

  // Saved data
  const [savedCharacters, setSavedCharacters] = useState<CharacterSheet[]>([]);
  const [savedThemes, setSavedThemes] = useState<StoryTheme[]>([]);
  const [showCharPicker, setShowCharPicker] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Save as theme
  const [showSaveTheme, setShowSaveTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");

  // Load saved data on mount
  useEffect(() => {
    setHasDraft(!!localStorage.getItem(DRAFT_KEY));
    fetch("/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "characters", subAction: "list" }),
    }).then(r => r.json()).then(d => {
      if (d.data?.characters) setSavedCharacters(d.data.characters);
    }).catch(() => {});
    fetch("/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "themes", subAction: "list" }),
    }).then(r => r.json()).then(d => {
      if (d.data?.themes) setSavedThemes(d.data.themes);
    }).catch(() => {});

    // Load from URL params (from themes page "Use Theme")
    const themeId = searchParams.get("themeId");
    if (themeId) {
      fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "themes", subAction: "list" }),
      }).then(r => r.json()).then(d => {
        const theme = d.data?.themes?.find((t: StoryTheme) => t.id === themeId);
        if (theme) applyTheme(theme);
      }).catch(() => {});
    }
  }, [searchParams]);

  // Auto-save draft
  useEffect(() => {
    if (generating) return;
    const draft: Draft = { title, premise, genres, era, moods, setting, pov, length, wordCountRange, characters, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [title, premise, genres, era, moods, setting, pov, length, wordCountRange, characters, generating]);

  const loadDraft = () => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d: Draft = JSON.parse(raw);
      setTitle(d.title); setTitleManuallyEdited(!!d.title);
      setPremise(d.premise); setGenres(d.genres);
      setEra(d.era); setMoods(d.moods);
      setSetting(d.setting); setPov(d.pov);
      setLength(d.length); setWordCountRange(d.wordCountRange || "standard");
      setCharacters(d.characters);
      setSelectedTheme("");
      setHasDraft(false);
    } catch {}
  };

  // Template: sets everything (theme + characters + params)
  const applyTemplate = (id: string) => {
    setSelectedTheme(id);
    const t = STORY_TEMPLATES.find((tmpl) => tmpl.id === id);
    if (!t) return;
    setPremise(t.premise); setGenres([...t.genre]); setEra(t.era); setMoods([...t.moods]);
    setSetting(t.setting); setPov(t.pov); setLength(t.length);
    setCharacters(t.characters.map(c => ({ ...c })));
    setWordCountRange("standard");
    setExpandedChars({});
    if (!titleManuallyEdited) setTitle(t.name);
  };

  // Theme: sets only premise + tags (NOT characters, NOT params)
  const applyTheme = (theme: StoryTheme) => {
    setPremise(theme.premise);
    if (theme.genre?.length) setGenres([...theme.genre]);
    if (theme.era) setEra(theme.era);
    if (theme.setting) setSetting(theme.setting);
    if (theme.mood?.length) setMoods([...theme.mood]);
    setSelectedTheme(theme.id);
  };

  const importCharacter = (cs: CharacterSheet) => {
    if (characters.some(c => c.name === cs.name)) return;
    const newChar: StoryCharacter & Record<string, unknown> = {
      name: cs.name,
      role: (cs.role as StoryCharacter["role"]) || "supporting",
      description: cs.description || cs.backstory?.slice(0, 100) || "",
      personality: (cs.personality as string[])?.join(", ") || "",
      appearance: cs.appearance || "",
      backstory: cs.backstory || "",
      speechPatterns: cs.speechPatterns || "",
      relationships: cs.relationships || "",
    };
    setCharacters(prev => [...prev, newChar as StoryCharacter]);
    setShowCharPicker(false);
  };

  const updateCharacter = (idx: number, field: string, value: string) => {
    setCharacters(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      return { ...(c as unknown as Record<string, unknown>), [field]: value } as unknown as StoryCharacter;
    }));
  };

  const removeCharacter = (idx: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== idx));
    setExpandedChars(prev => { const next = { ...prev }; delete next[idx]; return next; });
  };

  const saveCharacter = async (char: StoryCharacter) => {
    if (!char.name.trim() || !char.description.trim()) return;
    try {
      const res = await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "characters", subAction: "create",
          name: char.name, role: char.role, description: char.description,
          personality: char.personality ? [char.personality] : [],
          appearance: char.appearance || "",
          backstory: char.backstory || "",
          speechPatterns: char.speechPatterns || "",
          relationships: char.relationships || "",
          tags: [],
        }),
      });
      const d = await res.json();
      if (d.data?.id) {
        // Refresh saved characters list
        const listRes = await fetch("/api/stories", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "characters", subAction: "list" }),
        });
        const listD = await listRes.json();
        if (listD.data?.characters) setSavedCharacters(listD.data.characters);
      }
    } catch {}
  };

  const toggleCharExpand = (idx: number) => {
    setExpandedChars(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const saveAsTheme = async () => {
    if (!newThemeName.trim() || !premise.trim()) return;
    try {
      const res = await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "themes", subAction: "create",
          name: newThemeName.trim(), premise, genre: genres, era, setting, mood: moods,
          notes: `Characters: ${characters.map(c => c.name).filter(Boolean).join(", ")}`,
        }),
      });
      const d = await res.json();
      if (d.data?.id) {
        const listRes = await fetch("/api/stories", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "themes", subAction: "list" }),
        });
        const listD = await listRes.json();
        if (listD.data?.themes) setSavedThemes(listD.data.themes);
      }
      setShowSaveTheme(false);
      setNewThemeName("");
    } catch {}
  };

  const deleteTheme = async (id: string) => {
    try {
      await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "themes", subAction: "delete", promptId: id }),
      });
      setSavedThemes(prev => prev.filter(t => t.id !== id));
      if (selectedTheme === id) setSelectedTheme("");
    } catch {}
  };

  const clearAllInputs = () => {
    setSelectedTheme(""); setTitle(""); setTitleManuallyEdited(false);
    setPremise(""); setGenres([]); setEra(""); setMoods([]); setSetting("");
    setCharacters([]); setPov("first"); setLength("medium");
    setWordCountRange("standard"); setExpandedChars({});
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
    setGenError(null);

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

      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setGenStoryId(d.data.id);
      setGenDone(true);
    } catch (err) {
      setGenerating(false);
      setGenError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [title, premise, genres, era, setting, moods, pov, length, characters, wordCountRange]);

  const handleGenComplete = useCallback(() => {
    if (genStoryId) router.push("/recroom/story-weaver/" + genStoryId);
  }, [genStoryId, router]);

  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines">
      <GenerateOverlay title={title || "Your Story"} visible={generating} done={genDone} onComplete={handleGenComplete} />

      {/* Error banner */}
      {genError && (
        <div className="sticky top-0 z-50 bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-red-300 font-semibold">Story generation failed</p>
            <p className="text-xs text-red-300/60">{genError}</p>
            <p className="text-xs text-red-300/40 mt-1">Your configuration has been saved. You can retry without re-entering everything.</p>
          </div>
          <button onClick={() => setGenError(null)} className="text-red-400/50 hover:text-red-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Character Picker Modal */}
      {showCharPicker && (
        <div className="fixed inset-0 z-[60] bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-purple-500/20 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Import Character</h3>
              <button onClick={() => setShowCharPicker(false)} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
            </div>
            {savedCharacters.length === 0 ? (
              <p className="text-xs text-white/30">No saved characters. Create some in the Characters page first.</p>
            ) : (
              <div className="space-y-2">
                {savedCharacters.map(cs => (
                  <button key={cs.id} onClick={() => importCharacter(cs)}
                    disabled={characters.some(c => c.name === cs.name)}
                    className="w-full text-left p-3 rounded-lg border border-white/5 hover:border-purple-500/20 bg-white/[0.02] hover:bg-purple-500/5 transition-all disabled:opacity-30">
                    <div className="text-xs font-semibold text-white/80">{cs.name}</div>
                    <div className="text-[10px] text-white/30 font-mono">{cs.role} — {cs.description?.slice(0, 80)}</div>
                    {cs.personality?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cs.personality.slice(0, 3).map(p => <span key={p} className="px-1.5 py-0.5 rounded text-[8px] font-mono border border-white/5 bg-white/[0.02] text-white/25">{p}</span>)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save as Theme Modal */}
      {showSaveTheme && (
        <div className="fixed inset-0 z-[60] bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-green-500/20 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Save as Theme</h3>
            <p className="text-xs text-white/40">Save your current story concept as a reusable theme.</p>
            <input value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Theme name..." autoFocus
              className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none font-mono" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveTheme(false)} className="px-4 py-2 text-xs text-white/40 hover:text-white/60 rounded-lg border border-white/10">Cancel</button>
              <button onClick={saveAsTheme} disabled={!newThemeName.trim() || !premise.trim()}
                className="px-4 py-2 text-xs text-green-400 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-30 flex items-center gap-2">
                <Save className="w-3 h-3" /> Save Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-dark-900/50 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/recroom/story-weaver")} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5"><ChevronLeft className="w-4 h-4" /></button>
          <Sparkles className="w-5 h-5 text-neon-purple" />
          <h1 className="text-lg font-bold text-white">Create Story</h1>
          <div className="flex-1" />
          {hasDraft && (
            <button onClick={loadDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/20 text-[10px] font-mono text-orange-400 hover:bg-orange-500/10">
              <FolderOpen className="w-3 h-3" /> Load Draft
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ═══ SECTION A: Templates + Clear ═══ */}
        <div className="rounded-xl border border-purple-500/15 bg-dark-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Quick Start — Templates</label>
            <button onClick={clearAllInputs}
              className="flex items-center gap-1 text-[10px] font-mono text-red-400 hover:text-red-300">
              <X className="w-3 h-3" /> Clear all inputs
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STORY_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t.id)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  selectedTheme === t.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-white/[0.02] hover:border-white/15"
                }`}>
                <div className="text-xs font-semibold text-white/80 mb-0.5">{t.name}</div>
                <div className="text-[9px] font-mono text-white/30">{t.genre.join(", ")}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ SECTION B: Title ═══ */}
        <div className="rounded-xl border border-purple-500/20 bg-dark-900/50 p-5">
          <label className="text-xs font-mono text-white/40 uppercase tracking-widest block mb-2">Story Title</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); setTitleManuallyEdited(true); }} placeholder="Give your story a name..."
            className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-lg text-white placeholder-white/20 outline-none focus:border-purple-500/30 font-serif font-semibold" />
        </div>

        {/* ═══ SECTION C: Theme (Premise + Tags + Saved Themes) ═══ */}
        <div className="rounded-xl border border-green-500/15 bg-dark-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Theme</label>
            <button onClick={() => setShowSaveTheme(true)} disabled={!premise.trim()}
              className="flex items-center gap-1 text-[10px] font-mono text-green-400 hover:text-green-300 disabled:opacity-30">
              <Save className="w-3 h-3" /> Save as Theme
            </button>
          </div>
          <label className="text-[10px] font-mono text-white/25 uppercase tracking-wider block mb-2">What&apos;s your story about?</label>
          <textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={4}
            className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-green-500/30 font-mono resize-none leading-relaxed mb-4" placeholder="Describe your story concept..." />
          <div className="space-y-3">
            <Tags label="Genre" options={genreOpts} selected={genres} onToggle={(t) => toggle(genres, setGenres, t)} onAdd={(t) => addOpt(genreOpts, setGenreOpts, t)} />
            <Tags label="Era" options={eraOpts} selected={[era]} onToggle={(t) => setEra(t === era ? "" : t)} onAdd={(t) => addOpt(eraOpts, setEraOpts, t)} />
            <Tags label="Mood" options={moodOpts} selected={moods} onToggle={(t) => toggle(moods, setMoods, t)} onAdd={(t) => addOpt(moodOpts, setMoodOpts, t)} />
            <Tags label="Setting" options={settingOpts} selected={[setting]} onToggle={(t) => setSetting(t === setting ? "" : t)} onAdd={(t) => addOpt(settingOpts, setSettingOpts, t)} />
          </div>
          {/* Saved themes */}
          {savedThemes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <label className="text-[10px] font-mono text-white/20 uppercase tracking-wider block mb-2">Saved Themes</label>
              <div className="flex flex-wrap gap-2">
                {savedThemes.map((t) => (
                  <div key={t.id} className={`relative group px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    selectedTheme === t.id ? "border-green-500/40 bg-green-500/10" : "border-green-500/10 bg-green-500/[0.02] hover:border-green-500/25"
                  }`} onClick={() => applyTheme(t)}>
                    <span className="text-[10px] font-mono text-green-400/80">{t.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteTheme(t.id); }}
                      className="absolute -top-1 -right-1 p-0.5 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION D: Characters ═══ */}
        <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Characters ({characters.length})
            </label>
            <div className="flex items-center gap-2">
              {savedCharacters.length > 0 && (
                <button onClick={() => setShowCharPicker(true)}
                  className="flex items-center gap-1 text-[10px] font-mono text-neon-purple hover:text-purple-300">
                  <Users className="w-3 h-3" /> From Library
                </button>
              )}
              <button onClick={() => setCharacters(prev => [...prev, { ...EMPTY_CHARACTER }])}
                className="flex items-center gap-1 text-[10px] font-mono text-neon-purple hover:text-purple-300">
                <Plus className="w-3 h-3" /> Add Character
              </button>
            </div>
          </div>
          {characters.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/25">No characters yet. Add one or import from your library.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {characters.map((char, i) => (
                <CharacterCard
                  key={i}
                  char={char}
                  index={i}
                  onUpdate={updateCharacter}
                  onRemove={removeCharacter}
                  onSave={saveCharacter}
                  expanded={!!expandedChars[i]}
                  onToggle={toggleCharExpand}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══ SECTION E: Story Parameters ═══ */}
        <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5 space-y-4">
          <label className="text-xs font-mono text-white/40 uppercase tracking-widest block">Story Parameters</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Point of View</label>
              <select value={pov} onChange={(e) => setPov(e.target.value)}
                className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono">
                <option value="first">First Person</option>
                <option value="third-limited">Third Person Limited</option>
                <option value="third-omniscient">Third Person Omniscient</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Length</label>
              <select value={length} onChange={(e) => setLength(e.target.value)}
                className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono">
                <option value="short">Short (3-4 chapters)</option>
                <option value="medium">Medium (5-7 chapters)</option>
                <option value="long">Long (8-12 chapters)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Chapter Length (words per chapter)</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "short", label: "800-1.2k" }, { id: "medium", label: "1.2-1.8k" },
                { id: "standard", label: "1.8-2.5k" }, { id: "long", label: "2.5-3.5k" },
                { id: "epic", label: "3.5-5k" }, { id: "marathon", label: "5k+" },
              ].map((opt) => (
                <button key={opt.id} onClick={() => setWordCountRange(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    wordCountRange === opt.id ? "border-purple-500/40 bg-purple-500/15 text-neon-purple" : "border-white/8 text-white/30 hover:text-white/50"
                  }`}>{opt.label}</button>
              ))}
            </div>
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
