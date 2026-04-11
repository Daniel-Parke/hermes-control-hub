// ═══════════════════════════════════════════════════════════════
// Story Weaver v3 — Collaborative Interactive Fiction
// ═══════════════════════════════════════════════════════════════
// Phases: Config → Generating → Management → Reading
// Features:
// - Story title input
// - 8 pre-built templates with rich character/premise data
// - Tag-based genre/era/mood/setting with custom [+] tags
// - Story plan generation (with optional deviation hooks)
// - Background chapter generation with progress
// - Auto-save to filesystem
// - Management page with CRUD + chapter status + fun messages
// - Book-like reading UI

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { BookOpen, ChevronRight, ChevronLeft, Sparkles, Plus, X, Trash2, Download, RotateCcw, FolderOpen, CheckCircle2 } from "lucide-react";
import ActivityLayout from "@/components/recroom/ActivityLayout";
import { REC_ROOM_ACTIVITIES, STORY_TEMPLATES, CHAPTER_STATUSES } from "@/types/recroom";
import type { StoryTemplate, StoryConfig, StoryOutline, StoryPage, StoryCharacter, StoryChapterStatus, SavedItem } from "@/types/recroom";
import { EXAMPLE_PROMPTS } from "@/lib/recroom/prompt-templates";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = { BookOpen, Zap: BookOpen };
const activityMeta = REC_ROOM_ACTIVITIES.find((a) => a.id === "story-weaver")!;

const DEFAULT_GENRES = ["Sci-Fi", "Mystery", "Fantasy", "Romance", "Crime", "Horror", "Adventure", "Historical"];
const DEFAULT_ERAS = ["Ancient", "Medieval", "Modern", "Near Future", "Far Future", "Timeless"];
const DEFAULT_MOODS = ["Tense", "Wonder", "Humorous", "Dark", "Hopeful", "Melancholy", "Suspenseful", "Whimsical"];
const DEFAULT_SETTINGS = ["Space Station", "Medieval Castle", "Modern City", "Underwater", "Forest", "Desert", "Island", "Train"];
const POVS = [
  { value: "first", label: "First Person" },
  { value: "third-limited", label: "Third Person Limited" },
  { value: "third-omniscient", label: "Third Omniscient" },
];

type StoryPhase = "config" | "generating" | "management" | "reading";

const LOADING_MESSAGES = [
  "The muse is visiting...",
  "Weaving plot threads...",
  "Developing characters...",
  "Building your world...",
  "The story writes itself... almost...",
  "Consulting the narrative oracle...",
];

// ── Tag Selector ─────────────────────────────────────────────

function TagSelector({ label, options, selected, onToggle, onAdd }: {
  label: string; options: string[]; selected: string[];
  onToggle: (tag: string) => void; onAdd: (tag: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");

  return (
    <div>
      <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((tag) => (
          <button key={tag} onClick={() => onToggle(tag)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all ${
              selected.includes(tag) ? "border-purple-500/40 bg-purple-500/15 text-neon-purple" : "border-white/8 text-white/30 hover:text-white/50 hover:border-white/15"
            }`}>{tag}</button>
        ))}
        {adding ? (
          <div className="flex items-center gap-1">
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { onAdd(newTag.trim()); setNewTag(""); setAdding(false); } if (e.key === "Escape") setAdding(false); }}
              className="w-24 bg-dark-800/50 border border-purple-500/30 rounded px-2 py-1 text-[10px] font-mono text-white outline-none" autoFocus placeholder="New tag..." />
            <button onClick={() => { if (newTag.trim()) { onAdd(newTag.trim()); setNewTag(""); setAdding(false); } }} className="p-0.5 rounded text-neon-purple"><Plus className="w-3 h-3" /></button>
            <button onClick={() => setAdding(false)} className="p-0.5 rounded text-white/30"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="px-2 py-1 rounded-md text-[10px] font-mono border border-dashed border-white/10 text-white/20 hover:text-white/40">+ Add</button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function StoryWeaverPage() {
  const [phase, setPhase] = useState<StoryPhase>("config");
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  // Config
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("cosmic-voyager");
  const [premise, setPremise] = useState(STORY_TEMPLATES[0].premise);
  const [genres, setGenres] = useState<string[]>([...STORY_TEMPLATES[0].genre]);
  const [era, setEra] = useState(STORY_TEMPLATES[0].era);
  const [moods, setMoods] = useState<string[]>([...STORY_TEMPLATES[0].moods]);
  const [setting, setSetting] = useState(STORY_TEMPLATES[0].setting);
  const [pov, setPov] = useState<"first" | "third-limited" | "third-omniscient">(STORY_TEMPLATES[0].pov);
  const [length, setLength] = useState<"short" | "medium" | "long">(STORY_TEMPLATES[0].length);
  const [characters, setCharacters] = useState<StoryCharacter[]>([...STORY_TEMPLATES[0].characters]);
  const [genreOptions, setGenreOptions] = useState<string[]>([...DEFAULT_GENRES]);
  const [eraOptions, setEraOptions] = useState<string[]>([...DEFAULT_ERAS]);
  const [moodOptions, setMoodOptions] = useState<string[]>([...DEFAULT_MOODS]);
  const [settingOptions, setSettingOptions] = useState<string[]>([...DEFAULT_SETTINGS]);

  // Story state
  const [storyId, setStoryId] = useState<string | null>(null);
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [chapters, setChapters] = useState<StoryChapterStatus[]>([]);
  const [chapterContents, setChapterContents] = useState<Record<number, string>>({});
  const [currentChapter, setCurrentChapter] = useState(1);
  const [steerText, setSteerText] = useState("");
  const [savedStories, setSavedStories] = useState<SavedItem[]>([]);

  // Loading message rotation
  useEffect(() => {
    if (phase !== "generating") return;
    const interval = setInterval(() => {
      setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [phase]);

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

  const getConfig = useCallback((): StoryConfig => ({
    premise, genre: genres.join(", "), setting, era, mood: moods, language: "English",
    characters, length, pacing: 3, complexity: 3, pov, arc: "rising-action",
  }), [premise, genres, setting, era, moods, characters, length, pov]);

  const toggleTag = (list: string[], setList: (v: string[]) => void, tag: string) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };
  const addTag = (options: string[], setOptions: (v: string[]) => void, tag: string) => {
    if (!options.includes(tag)) setOptions([...options, tag]);
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    const t = STORY_TEMPLATES.find((tmpl) => tmpl.id === id);
    if (!t) return;
    setPremise(t.premise);
    setGenres([...t.genre]);
    setEra(t.era);
    setMoods([...t.moods]);
    setSetting(t.setting);
    setPov(t.pov);
    setLength(t.length);
    setCharacters([...t.characters]);
    if (!title) setTitle(t.name);
  };

  // ── Start Generation (plan + first chapter in background) ──

  const handleStart = useCallback(async () => {
    if (!premise.trim()) return;
    setPhase("generating");
    setGenerating(true);
    const sid = "story_" + Date.now().toString(36);
    setStoryId(sid);

    try {
      // Step 1: Generate story plan
      const planData = await callAPI({
        action: "generate",
        activity: "story-weaver",
        prompt: premise,
        context: { step: "plan", config: getConfig(), storyTitle: title || "Untitled Story" },
      });
      const cleaned = planData.output.replace(/```json\s*/i, "").replace(/```\s*/g, "").trim();
      const plan: StoryOutline = JSON.parse(cleaned);
      setOutline(plan);

      // Use plan title if user didn't set one
      if (!title && plan.title) setTitle(plan.title);

      // Initialize chapter statuses
      const chStatuses: StoryChapterStatus[] = plan.chapters.map((ch, i) => ({
        number: i + 1,
        title: ch.title,
        status: "pending" as const,
        wordCount: 0,
        generatedAt: null,
        funnyStatus: CHAPTER_STATUSES.pending,
      }));
      setChapters(chStatuses);

      // Step 2: Generate first chapter immediately
      chStatuses[0].status = "writing";
      chStatuses[0].funnyStatus = CHAPTER_STATUSES.writing;
      setChapters([...chStatuses]);

      const chapterData = await callAPI({
        action: "generate",
        activity: "story-weaver",
        prompt: premise,
        context: {
          step: "chapter",
          config: getConfig(),
          storyPlan: plan,
          previousChapters: [],
          chapterNumber: 1,
          isFirstChapter: true,
        },
      });

      chStatuses[0].status = "complete";
      chStatuses[0].wordCount = chapterData.output.split(/\s+/).length;
      chStatuses[0].generatedAt = new Date().toISOString();
      chStatuses[0].funnyStatus = CHAPTER_STATUSES.complete;
      setChapterContents({ 1: chapterData.output });
      setChapters([...chStatuses]);

      // Auto-save
      await callAPI({
        action: "save",
        activity: "story-weaver",
        name: title || plan.title || "Untitled Story",
        prompt: premise,
        context: {
          output: chapterData.output,
          outputFormat: "text",
          storyId: sid,
          outline: plan,
          chapters: chStatuses,
          chapterContents: { 1: chapterData.output },
          config: getConfig(),
        },
      });

      // Move to management
      setPhase("management");
    } catch (error) {
      // Show management with error state
      setPhase("management");
    } finally {
      setGenerating(false);
    }
  }, [premise, title, callAPI, getConfig]);

  // ── Generate Next Chapter ───────────────────────────────────

  const handleWriteNextChapter = useCallback(async () => {
    const nextNum = chapters.filter((c) => c.status === "complete").length + 1;
    if (nextNum > chapters.length) return;

    setChapters((prev) => prev.map((c) =>
      c.number === nextNum ? { ...c, status: "writing" as const, funnyStatus: CHAPTER_STATUSES.writing } : c
    ));

    try {
      const data = await callAPI({
        action: "generate",
        activity: "story-weaver",
        prompt: premise,
        context: {
          step: "chapter",
          config: getConfig(),
          storyPlan: outline,
          previousChapters: Object.entries(chapterContents)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, content]) => content),
          chapterNumber: nextNum,
          userDirection: steerText || undefined,
        },
      });

      setChapterContents((prev) => ({ ...prev, [nextNum]: data.output }));
      setChapters((prev) => prev.map((c) =>
        c.number === nextNum ? {
          ...c, status: "complete" as const,
          wordCount: data.output.split(/\s+/).length,
          generatedAt: new Date().toISOString(),
          funnyStatus: CHAPTER_STATUSES.complete,
        } : c
      ));
      setSteerText("");

      // Auto-save
      if (storyId) {
        await callAPI({
          action: "save",
          activity: "story-weaver",
          name: title || "Untitled Story",
          prompt: premise,
          context: {
            output: data.output,
            outputFormat: "text",
            storyId,
            outline,
            chapters: chapters.map((c) => c.number === nextNum ? { ...c, status: "complete" } : c),
            chapterContents: { ...chapterContents, [nextNum]: data.output },
            config: getConfig(),
          },
        });
      }
    } catch {
      setChapters((prev) => prev.map((c) =>
        c.number === nextNum ? { ...c, status: "failed" as const, funnyStatus: CHAPTER_STATUSES.failed } : c
      ));
    }
  }, [chapters, chapterContents, outline, premise, steerText, callAPI, getConfig, storyId, title]);

  // ── Load Saved Stories ──────────────────────────────────────

  const fetchSaved = useCallback(async () => {
    try {
      const data = await callAPI({ action: "list", activity: "story-weaver" });
      setSavedStories(data.items || []);
    } catch {}
  }, [callAPI]);

  useEffect(() => { if (phase === "management") fetchSaved(); }, [phase, fetchSaved]);

  const handleLoadStory = useCallback(async (id: string) => {
    try {
      const data = await callAPI({ action: "load", activity: "story-weaver", id });
      if (data.metadata?.outline) setOutline(data.metadata.outline);
      if (data.metadata?.chapters) setChapters(data.metadata.chapters);
      if (data.metadata?.chapterContents) setChapterContents(data.metadata.chapterContents);
      if (data.metadata?.storyId) setStoryId(data.metadata.storyId);
      if (data.name) setTitle(data.name);
      if (data.prompt) setPremise(data.prompt);
      setPhase("management");
    } catch {}
  }, [callAPI]);

  const handleDeleteStory = useCallback(async (id: string) => {
    if (!confirm("Delete this story?")) return;
    await callAPI({ action: "delete", activity: "story-weaver", id });
    fetchSaved();
  }, [callAPI, fetchSaved]);

  const handleReadChapter = (num: number) => {
    setCurrentChapter(num);
    setPhase("reading");
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <ActivityLayout activity={activityMeta} iconMap={iconMap}>

      {/* ═══ CONFIG PHASE ═══ */}
      {phase === "config" && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title */}
          <div className="rounded-xl border border-purple-500/20 bg-dark-900/50 p-5">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest block mb-2">
              Story Title
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your story a name..."
              className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-lg text-white placeholder-white/20 outline-none focus:border-purple-500/30 font-serif font-semibold" />
          </div>

          {/* Templates */}
          <div className="rounded-xl border border-purple-500/20 bg-dark-900/50 p-5">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest block mb-3">Quick Start — Templates</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STORY_TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => handleTemplateSelect(t.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedTemplate === t.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-white/[0.02] hover:border-white/15"
                  }`}>
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
              className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/30 font-mono resize-none leading-relaxed"
              placeholder="Describe your story concept..." />
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5 space-y-4">
            <TagSelector label="Genre" options={genreOptions} selected={genres}
              onToggle={(tag) => toggleTag(genres, setGenres, tag)}
              onAdd={(tag) => addTag(genreOptions, setGenreOptions, tag)} />
            <TagSelector label="Era" options={eraOptions} selected={[era]}
              onToggle={(tag) => setEra(tag === era ? "" : tag)}
              onAdd={(tag) => addTag(eraOptions, setEraOptions, tag)} />
            <TagSelector label="Mood" options={moodOptions} selected={moods}
              onToggle={(tag) => toggleTag(moods, setMoods, tag)}
              onAdd={(tag) => addTag(moodOptions, setMoodOptions, tag)} />
            <TagSelector label="Setting" options={settingOptions} selected={[setting]}
              onToggle={(tag) => setSetting(tag === setting ? "" : tag)}
              onAdd={(tag) => addTag(settingOptions, setSettingOptions, tag)} />
          </div>

          {/* Characters */}
          <div className="rounded-xl border border-white/8 bg-dark-900/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Characters</label>
              <button onClick={() => setCharacters((prev) => [...prev, { name: "", role: "supporting", description: "" }])}
                className="text-[10px] font-mono text-neon-purple hover:text-purple-400 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
            </div>
            <div className="space-y-2">
              {characters.map((char, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input value={char.name} onChange={(e) => setCharacters((prev) => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                    placeholder="Name" className="flex-1 bg-dark-800/50 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none font-mono" />
                  <select value={char.role} onChange={(e) => setCharacters((prev) => prev.map((c, j) => j === i ? { ...c, role: e.target.value as StoryCharacter["role"] } : c))}
                    className="bg-dark-800/50 border border-white/8 rounded-lg px-2 py-2 text-xs text-white outline-none font-mono w-28">
                    {["protagonist", "ally", "antagonist", "supporting", "mystery"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input value={char.description} onChange={(e) => setCharacters((prev) => prev.map((c, j) => j === i ? { ...c, description: e.target.value } : c))}
                    placeholder="Description" className="flex-[2] bg-dark-800/50 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none font-mono" />
                  <button onClick={() => setCharacters((prev) => prev.filter((_, j) => j !== i))} className="p-2 rounded-lg text-white/20 hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* POV + Length */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/8 bg-dark-900/50 p-4">
              <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Point of View</label>
              <select value={pov} onChange={(e) => setPov(e.target.value as typeof pov)}
                className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono">
                {POVS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="rounded-xl border border-white/8 bg-dark-900/50 p-4">
              <label className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-2">Length</label>
              <select value={length} onChange={(e) => setLength(e.target.value as typeof length)}
                className="w-full bg-dark-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono">
                <option value="short">Short (3-4 chapters)</option>
                <option value="medium">Medium (5-7 chapters)</option>
                <option value="long">Long (8-12 chapters)</option>
              </select>
            </div>
          </div>

          {/* Saved Stories */}
          <div className="rounded-xl border border-white/5 bg-dark-900/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-white/30 uppercase tracking-widest">Saved Stories</label>
              <button onClick={fetchSaved} className="text-[10px] font-mono text-white/20 hover:text-white/40">Refresh</button>
            </div>
            {savedStories.length === 0 ? (
              <p className="text-xs text-white/20 text-center py-2">No saved stories yet</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {savedStories.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.04]">
                    <button onClick={() => handleLoadStory(s.id)} className="text-xs text-white/60 hover:text-white/80 flex-1 text-left truncate">{s.name}</button>
                    <button onClick={() => handleDeleteStory(s.id)} className="p-1 text-white/20 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button onClick={handleStart} disabled={!premise.trim() || generating}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-base font-mono text-neon-purple hover:bg-purple-500/20 transition-all disabled:opacity-30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <Sparkles className={`w-5 h-5 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Generating..." : "Begin Writing"}
          </button>
        </div>
      )}

      {/* ═══ GENERATING PHASE ═══ */}
      {phase === "generating" && (
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-24">
          <div className="rounded-2xl border border-purple-500/20 bg-dark-900/50 p-12 text-center">
            <Sparkles className="w-12 h-12 text-neon-purple animate-pulse mx-auto mb-6" />
            <h2 className="text-lg font-serif text-white mb-2">{title || "Your Story"}</h2>
            <p className="text-sm text-white/40 mb-6 animate-pulse">{loadingMsg}</p>
            <div className="space-y-1 text-xs font-mono text-white/20">
              <div>Plan: {outline ? "✓" : "..."}</div>
              <div>Chapter 1: {chapters[0]?.status === "complete" ? "✓" : chapters[0]?.status === "writing" ? "writing..." : "pending"}</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MANAGEMENT PHASE ═══ */}
      {phase === "management" && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Story Header */}
          <div className="rounded-xl border border-purple-500/20 bg-dark-900/50 p-6">
            <h2 className="text-xl font-serif text-white mb-1">{title || outline?.title || "Untitled Story"}</h2>
            <p className="text-xs text-white/40 font-mono">{chapters.length} chapters · {genres.join(", ")}</p>
            {outline?.premise && <p className="text-xs text-white/30 mt-2 leading-relaxed">{outline.premise}</p>}
          </div>

          {/* Chapters */}
          <div className="rounded-xl border border-white/8 bg-dark-900/50 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 bg-dark-800/30">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Chapters</span>
            </div>
            <div className="divide-y divide-white/5">
              {chapters.map((ch) => (
                <div key={ch.number} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-neon-purple w-8">Ch.{ch.number}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-white/80 truncate">{ch.title}</div>
                      <div className="text-[10px] text-white/25 font-mono">
                        {ch.status === "complete" ? `${ch.wordCount} words` : ch.funnyStatus}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ch.status === "complete" && (
                      <button onClick={() => handleReadChapter(ch.number)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-mono text-white/50 hover:text-white/70 hover:bg-white/5">
                        <BookOpen className="w-3 h-3" /> Read
                      </button>
                    )}
                    {ch.status === "writing" && (
                      <span className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono text-neon-purple">
                        <Sparkles className="w-3 h-3 animate-pulse" /> Writing...
                      </span>
                    )}
                    {ch.status === "failed" && (
                      <button onClick={handleWriteNextChapter}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/20 text-[10px] font-mono text-red-400 hover:bg-red-500/10">
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Write Next Chapter */}
          {chapters.some((c) => c.status === "pending") && (
            <div className="rounded-xl border border-white/5 bg-dark-900/30 p-4">
              <label className="text-[10px] font-mono text-white/25 uppercase tracking-wider block mb-2">
                Steer next chapter (optional)
              </label>
              <div className="flex gap-2">
                <input value={steerText} onChange={(e) => setSteerText(e.target.value)}
                  placeholder="The captain discovers something shocking..."
                  className="flex-1 bg-dark-800/50 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/15 outline-none focus:border-purple-500/30 font-mono"
                  onKeyDown={(e) => { if (e.key === "Enter") handleWriteNextChapter(); }} />
                <button onClick={handleWriteNextChapter}
                  className="px-5 py-2 rounded-lg border border-purple-500/30 text-xs font-mono text-neon-purple hover:bg-purple-500/10">
                  Write Chapter {chapters.filter((c) => c.status === "complete").length + 1}
                </button>
              </div>
            </div>
          )}

          {/* All complete */}
          {chapters.length > 0 && chapters.every((c) => c.status === "complete") && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-neon-green mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">Story Complete!</h3>
              <p className="text-xs text-white/40">{chapters.length} chapters · {Object.values(chapterContents).join(" ").split(/\s+/).length.toLocaleString()} words</p>
              <button onClick={() => handleReadChapter(1)}
                className="mt-3 px-5 py-2 rounded-lg border border-green-500/30 text-xs font-mono text-neon-green hover:bg-green-500/10">
                Read from the beginning
              </button>
            </div>
          )}

          {/* Back / Actions */}
          <div className="flex gap-3">
            <button onClick={() => setPhase("config")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 text-sm font-mono text-white/50 hover:text-white/70 hover:bg-white/5">
              <ChevronLeft className="w-4 h-4" /> Edit Config
            </button>
          </div>
        </div>
      )}

      {/* ═══ READING PHASE (Book UI) ═══ */}
      {phase === "reading" && (
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between px-2">
            <button onClick={() => setPhase("management")} className="text-xs font-mono text-white/30 hover:text-white/50 flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" /> Back to Chapters
            </button>
            <div className="text-xs font-mono text-white/30">
              {title || outline?.title} — Chapter {currentChapter}: {chapters[currentChapter - 1]?.title}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]" style={{ background: "#1a1816" }}>
            {chapterContents[currentChapter] ? (
              <div className="min-h-[500px] p-8 md:p-12" style={{ background: "#0f0d0b" }}>
                <h3 className="text-lg font-serif mb-6 pb-4 border-b" style={{ color: "#e8dcc8", borderColor: "#2a2520" }}>
                  Chapter {currentChapter}: {chapters[currentChapter - 1]?.title}
                </h3>
                <div className="font-serif leading-[1.9] text-justify whitespace-pre-wrap" style={{ color: "#e8dcc8", fontSize: "15px", maxWidth: "700px", margin: "0 auto" }}>
                  {chapterContents[currentChapter]}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-24" style={{ background: "#0f0d0b" }}>
                <p className="text-sm" style={{ color: "#8a7e6d" }}>Chapter not yet written</p>
              </div>
            )}

            {/* Chapter Navigation */}
            <div className="flex items-center justify-between px-6 py-3 border-t" style={{ borderColor: "#2a2520", background: "#141210" }}>
              <button onClick={() => setCurrentChapter(Math.max(1, currentChapter - 1))} disabled={currentChapter <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-20" style={{ color: "#8a7e6d" }}>
                <ChevronLeft className="w-4 h-4" /> Prev Chapter
              </button>
              <div className="flex gap-1.5">
                {chapters.map((ch, i) => (
                  <button key={i} onClick={() => ch.status === "complete" && setCurrentChapter(i + 1)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${i + 1 === currentChapter ? "scale-125" : "opacity-40 hover:opacity-70"}`}
                    style={{ background: ch.status === "complete" ? (i + 1 === currentChapter ? "#a855f7" : "#4a3f35") : "#2a2520" }}
                    title={ch.title} />
                ))}
              </div>
              <button onClick={() => setCurrentChapter(Math.min(chapters.length, currentChapter + 1))} disabled={currentChapter >= chapters.length || chapters[currentChapter]?.status !== "complete"}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-20" style={{ color: "#e8dcc8" }}>
                Next Chapter <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Steer */}
          <div className="rounded-xl border border-white/5 p-4" style={{ background: "#141210" }}>
            <label className="text-[10px] font-mono text-white/25 uppercase tracking-wider block mb-2">What happens next?</label>
            <div className="flex gap-2">
              <input value={steerText} onChange={(e) => setSteerText(e.target.value)}
                placeholder="Something unexpected happens..."
                className="flex-1 bg-dark-800/50 border border-white/8 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/15 outline-none focus:border-purple-500/30 font-mono" />
              <button onClick={() => {
                if (steerText.trim()) {
                  setCurrentChapter(currentChapter + 1);
                  handleWriteNextChapter();
                  setSteerText("");
                }
              }} disabled={!steerText.trim()}
                className="px-5 py-2.5 rounded-lg border border-purple-500/30 text-xs font-mono text-neon-purple hover:bg-purple-500/10 disabled:opacity-30">
                Apply & Next
              </button>
            </div>
          </div>
        </div>
      )}
    </ActivityLayout>
  );
}
