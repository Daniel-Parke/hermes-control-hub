// Story Weaver — Reader (Book UI)
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, BookOpen, Sparkles, Loader2 } from "lucide-react";
import ChapterList from "@/components/story-weaver/ChapterList";
import SteerInput from "@/components/story-weaver/SteerInput";

interface Chapter { number: number; title: string; status: string; wordCount: number; generatedAt?: string | null; }

export default function StoryReaderPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;

  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Auto-generate next chapter if first is complete and next is pending
  useEffect(() => {
    if (!story || generating) return;
    const pending = story.chapters?.find((c: Chapter) => c.status === "pending");
    if (pending) {
      generateNext();
    }
  }, [story?.chapters]);

  const generateNext = useCallback(async (direction?: string) => {
    if (!story || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-chapter", storyId, userDirection: direction }),
      });
      const d = await res.json();
      if (d.data?.story) setStory(d.data.story);
    } catch {} finally { setGenerating(false); }
  }, [story, storyId, generating]);

  const handleSteer = (direction: string) => {
    const nextPending = story?.chapters?.find((c: Chapter) => c.status === "pending");
    if (nextPending) {
      generateNext(direction);
    }
  };

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

  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-dark-900/50 px-6 py-3 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/recroom/story-weaver")} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <BookOpen className="w-4 h-4 text-neon-purple" />
          <h1 className="text-sm font-semibold text-white truncate">{story.title}</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[10px] font-mono text-white/30 hover:text-white/50 px-2 py-1 rounded border border-white/5">
          {sidebarOpen ? "Hide Chapters" : "Chapters"}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chapter Sidebar */}
        {sidebarOpen && (
          <div className="w-56 flex-shrink-0 border-r border-white/5 bg-dark-900/30 p-4 overflow-y-auto">
            <ChapterList chapters={chapters} currentChapter={currentChapter} onSelect={setCurrentChapter} />
          </div>
        )}

        {/* Book Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto" style={{ background: "#0f0d0b" }}>
            {chapterContent ? (
              <div className="max-w-3xl mx-auto px-8 md:px-16 py-10">
                <h2 className="text-xl font-serif mb-8 pb-4 border-b" style={{ color: "#e8dcc8", borderColor: "#2a2520" }}>
                  Chapter {currentChapter}: {currentMeta?.title}
                </h2>
                <div className="font-serif leading-[1.9] text-justify whitespace-pre-wrap" style={{ color: "#e8dcc8", fontSize: "16px" }}>
                  {chapterContent}
                </div>
              </div>
            ) : currentMeta?.status === "writing" || currentMeta?.status === "pending" ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Sparkles className="w-8 h-8 text-neon-purple animate-pulse mb-4" />
                <p className="text-sm font-serif" style={{ color: "#8a7e6d" }}>
                  {currentMeta.status === "writing" ? "The muse is visiting..." : "Waiting for its moment..."}
                </p>
                <p className="text-xs mt-2" style={{ color: "#5a4f42" }}>Chapter {currentChapter} is being written</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm" style={{ color: "#5a4f42" }}>Select a chapter to read</p>
              </div>
            )}
          </div>

          {/* Chapter Navigation */}
          <div className="flex items-center justify-between px-6 py-3 border-t flex-shrink-0" style={{ borderColor: "#2a2520", background: "#141210" }}>
            <button onClick={() => setCurrentChapter(Math.max(1, currentChapter - 1))} disabled={currentChapter <= 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-20" style={{ color: "#8a7e6d" }}>
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <div className="flex gap-1.5">
              {chapters.map((ch, i) => (
                <button key={i} onClick={() => ch.status === "complete" && setCurrentChapter(i + 1)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i + 1 === currentChapter ? "scale-125" : "opacity-40 hover:opacity-70"}`}
                  style={{ background: ch.status === "complete" ? (i + 1 === currentChapter ? "#a855f7" : "#4a3f35") : "#2a2520" }} />
              ))}
            </div>
            <button onClick={() => setCurrentChapter(Math.min(chapters.length, currentChapter + 1))}
              disabled={currentChapter >= chapters.length || chapters[currentChapter]?.status !== "complete"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-20" style={{ color: "#e8dcc8" }}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Steer Input */}
          <div className="px-6 pb-4 flex-shrink-0" style={{ background: "#141210" }}>
            <SteerInput onSteer={handleSteer} loading={generating} />
          </div>
        </div>
      </div>
    </div>
  );
}
