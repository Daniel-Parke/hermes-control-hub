// Story Weaver — Reader (Book UI with settings, mobile layout, continuous scroll)
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, BookOpen, Sparkles, Loader2, Menu, X } from "lucide-react";
import ChapterList from "@/components/story-weaver/ChapterList";

import ReaderSettings, { loadSettings, DEFAULT_SETTINGS, FONTS, THEMES, type ReadingSettings } from "@/components/story-weaver/ReaderSettings";

interface Chapter { number: number; title: string; status: string; wordCount: number; readStatus?: "writing" | "unread" | "read"; generatedAt?: string | null; }

export default function StoryReaderPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;

  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Open chapters by default on desktop, closed on mobile
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load settings from localStorage
  useEffect(() => { setSettings(loadSettings()); }, []);

  const loadStory = useCallback(async () => {
    try {
      const res = await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load", storyId }),
      });
      const d = await res.json();
      if (d.data) setStory(d.data);
    } catch {} finally { setLoading(false); }
  }, [storyId]);

  useEffect(() => { loadStory(); }, [loadStory]);

  // Auto-generate next pending chapter — only trigger when NOT generating
  // and only for the FIRST pending chapter (sequential enforcement)
  useEffect(() => {
    if (!story || generating) return;
    const firstPending = story.chapters?.find((c: Chapter) => c.status === "pending");
    const anyWriting = story.chapters?.some((c: Chapter) => c.status === "writing");
    // Only generate if there's a pending chapter AND nothing is currently writing
    if (firstPending && !anyWriting) {
      generateNext();
    }
  }, [story?.chapters]);

  const generateNext = useCallback(async () => {
    if (!story) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-chapter", storyId }),
      });
      const d = await res.json();
      if (d.data?.story) setStory(d.data.story);
      else if (d.error) console.error("Chapter generation error:", d.error);
    } catch (e) { console.error("Chapter generation failed:", e); }
    finally { setGenerating(false); }
  }, [story, storyId]);

  // Mark chapter as read and move to next
  const handleNextChapter = useCallback(async () => {
    if (!story) return;
    const chapters: Chapter[] = story.chapters || [];
    const currentMeta = chapters[currentChapter - 1];

    // Mark current as read
    if (currentMeta?.readStatus !== "read") {
      try {
        const updatedChapters = chapters.map((c: Chapter) =>
          c.number === currentChapter ? { ...c, readStatus: "read" } : c
        );
        const updatedStory = { ...story, chapters: updatedChapters };
        setStory(updatedStory);

        // Persist read status
        await fetch("/api/stories", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update", storyId,
            chapters: updatedChapters,
          }),
        });
      } catch {}
    }

    // Move to next chapter
    const nextComplete = chapters.find((c: Chapter) => c.number > currentChapter && c.status === "complete");
    if (nextComplete) {
      setCurrentChapter(nextComplete.number);
      // Mark next as read-status unread if it was pending
      setStory((prev: any) => ({
        ...prev,
        chapters: prev.chapters.map((c: Chapter) =>
          c.number === nextComplete.number && !c.readStatus ? { ...c, readStatus: "unread" } : c
        ),
      }));
    }
  }, [story, currentChapter, storyId]);

  const handleChapterSelect = (num: number) => {
    setCurrentChapter(num);
    // Mark as read when selecting from sidebar
    setStory((prev: any) => ({
      ...prev,
      chapters: prev.chapters.map((c: Chapter) =>
        c.number === num && c.status === "complete" ? { ...c, readStatus: "read" } : c
      ),
    }));
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const theme = THEMES[settings.pageTheme] || THEMES.dark;
  const fontObj = FONTS.find(f => f.name === settings.fontFamily) || FONTS[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/40 mb-4">Story not found</p>
          <button onClick={() => router.push("/recroom/story-weaver")} className="text-xs text-neon-purple">← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const chapters: Chapter[] = story.chapters || [];
  const chapterContent = story.chapterContents?.[currentChapter] || "";
  const currentMeta = chapters[currentChapter - 1];
  const prevComplete = chapters.filter((c: Chapter) => c.number < currentChapter && c.status === "complete");
  const nextComplete = chapters.find((c: Chapter) => c.number > currentChapter && c.status === "complete");
  const prevChapter = currentChapter > 1 ? chapters[currentChapter - 2] : null;
  const nextChapter = nextComplete ? chapters[nextComplete.number - 1] : null;

  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines flex flex-col">
      {/* ═══ Reader Header — sticky bar below sidebar top bar ═══ */}
      <div className="sticky top-0 lg:top-0 z-30 border-b border-white/10 bg-dark-950/95 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between px-3 md:px-6 h-12">
          {/* Left: Back */}
          <button onClick={() => router.push("/recroom/story-weaver")}
            className="p-2.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Centre: Title */}
          <h1 className="text-sm font-semibold text-white truncate mx-2 flex-1 text-center min-w-0">
            {story.title}
          </h1>

          {/* Right: Chapters toggle + Settings */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] justify-center"
              title={sidebarOpen ? "Hide Chapters" : "Show Chapters"}>
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline">Chapters</span>
            </button>
            <ReaderSettings settings={settings} onChange={setSettings} />
          </div>
        </div>

        {/* Chapter indicator dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2 px-4">
          {chapters.map((ch, i) => (
            <button key={i} onClick={() => ch.status === "complete" && handleChapterSelect(i + 1)}
              className={`w-2 h-2 rounded-full transition-all ${
                i + 1 === currentChapter ? "scale-150" : "opacity-40 hover:opacity-70"
              }`}
              style={{ background: ch.status === "complete" ? (i + 1 === currentChapter ? theme.accent : "#4a3f35") : "#2a2520" }}
              title={`Chapter ${i + 1}: ${ch.title}`} />
          ))}
        </div>
      </div>

      {/* ═══ Body ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chapter Sidebar */}
        {sidebarOpen && (
          <div className="w-56 flex-shrink-0 border-r border-white/5 overflow-y-auto hidden md:block" style={{ background: theme.panel }}>
            <div className="p-4">
              <ChapterList chapters={chapters} currentChapter={currentChapter} onSelect={handleChapterSelect} />
            </div>
          </div>
        )}

        {/* Book Content — continuous scroll */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 w-full overflow-y-auto" style={{ background: theme.bg, filter: `brightness(${settings.brightness})` }}>
            {chapterContent ? (
              <div className="max-w-3xl mx-auto px-6 md:px-16 py-8 md:py-10">
                <h2 className="mb-8 pb-4 border-b" style={{
                  color: theme.text, borderColor: settings.pageTheme === "light" ? "#d4ccc0" : "#2a2520",
                  fontFamily: fontObj.family, fontSize: `${settings.fontSize + 6}px`, fontWeight: 600,
                }}>
                  Chapter {currentChapter}: {currentMeta?.title}
                </h2>
                <div className="whitespace-pre-wrap text-justify" style={{
                  color: theme.text, fontFamily: fontObj.family,
                  fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight,
                }}>
                  {chapterContent}
                </div>
              </div>
            ) : currentMeta?.status === "writing" || currentMeta?.status === "pending" ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <Sparkles className="w-8 h-8 animate-pulse mb-4" style={{ color: theme.accent }} />
                <p className="text-sm" style={{ color: theme.text, opacity: 0.5, fontFamily: fontObj.family }}>
                  {currentMeta.status === "writing" ? "The muse is visiting..." : "Waiting for its moment..."}
                </p>
                <p className="text-xs mt-2" style={{ color: theme.text, opacity: 0.3 }}>
                  Chapter {currentChapter} is being written
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <p className="text-sm" style={{ color: theme.text, opacity: 0.3 }}>Select a chapter to read</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t flex-shrink-0" style={{ borderColor: settings.pageTheme === "light" ? "#d4ccc0" : "#2a2520", background: theme.panel }}>
            <button onClick={() => setCurrentChapter(Math.max(1, currentChapter - 1))}
              disabled={currentChapter <= 1}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-mono disabled:opacity-20 min-h-[44px] max-w-[45%] truncate"
              style={{ color: theme.text, opacity: 0.6 }}>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{prevChapter ? prevChapter.title : "Prev"}</span>
            </button>

            {/* Chapter dots */}
            <div className="flex gap-1.5 overflow-x-auto max-w-[200px] md:max-w-none">
              {chapters.map((ch, i) => (
                <button key={i} onClick={() => ch.status === "complete" && handleChapterSelect(i + 1)}
                  className={`w-2.5 h-2.5 rounded-full transition-all flex-shrink-0 ${i + 1 === currentChapter ? "scale-125" : "opacity-40 hover:opacity-70"}`}
                  style={{ background: ch.status === "complete" ? (i + 1 === currentChapter ? theme.accent : "#4a3f35") : "#2a2520" }} />
              ))}
            </div>

            <button onClick={handleNextChapter}
              disabled={!nextComplete}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-mono disabled:opacity-20 min-h-[44px] max-w-[45%] truncate"
              style={{ color: theme.text }}>
              <span className="truncate">{nextChapter ? nextChapter.title : "Next"}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-dark-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 border-r border-white/10 overflow-y-auto" style={{ background: theme.panel }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end p-3">
              <button onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 pb-4">
              <ChapterList chapters={chapters} currentChapter={currentChapter} onSelect={handleChapterSelect} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
