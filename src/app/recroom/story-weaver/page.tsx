// Story Weaver — Dashboard
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, ChevronRight, Sparkles, Library, Users, FileText } from "lucide-react";
import StoryCard from "@/components/story-weaver/StoryCard";

interface StorySummary {
  id: string; title: string; premise?: string; status?: string;
  chapters?: { number: number; title: string; status: string; wordCount: number }[];
  config?: { genre?: string }; createdAt?: string; updatedAt?: string;
}

export default function StoryWeaverDashboard() {
  const router = useRouter();
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const d = await res.json();
      setStories(d.data?.stories || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    await fetch("/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", storyId: id }),
    });
    fetchStories();
  };

  const totalWords = stories.reduce((sum, s) => sum + (s.chapters || []).reduce((ws, c) => ws + (c.wordCount || 0), 0), 0);
  const totalChapters = stories.reduce((sum, s) => sum + (s.chapters || []).length, 0);
  const recent = stories.slice(0, 3);

  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines">
      {/* Header */}
      <div className="border-b border-white/10 bg-dark-900/50 px-6 py-5 backdrop-blur-xl border-t-2 border-purple-500/30">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-neon-purple" />
          <div>
            <h1 className="text-xl font-bold text-white">Story Weaver</h1>
            <p className="text-xs text-white/40 font-mono">Collaborative interactive fiction</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { label: "Stories", value: stories.length },
            { label: "Complete", value: stories.filter(s => s.status === "complete").length },
            { label: "In Progress", value: stories.filter(s => s.status === "active" || s.status === "generating").length },
            { label: "Chapters", value: totalChapters },
            { label: "Words Written", value: totalWords.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-dark-900/30 p-4 text-center">
              <div className="text-2xl font-bold text-white/80">{stat.value}</div>
              <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button onClick={() => router.push("/recroom/story-weaver/create")}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-sm font-mono text-neon-purple hover:bg-purple-500/20 transition-all shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <Plus className="w-4 h-4" /> Create
          </button>
          <button onClick={() => router.push("/recroom/story-weaver/library")}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/10 text-sm font-mono text-white/50 hover:text-white/70 hover:bg-white/5 transition-all">
            <Library className="w-4 h-4" /> Library
          </button>
          <button onClick={() => router.push("/recroom/story-weaver/characters")}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/10 text-sm font-mono text-white/50 hover:text-white/70 hover:bg-white/5 transition-all">
            <Users className="w-4 h-4" /> Characters
          </button>
          <button onClick={() => router.push("/recroom/story-weaver/themes")}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/10 text-sm font-mono text-white/50 hover:text-white/70 hover:bg-white/5 transition-all">
            <FileText className="w-4 h-4" /> Themes
          </button>
        </div>

        {/* Recent Stories */}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">Recent Stories</h2>
              {stories.length > 3 && (
                <button onClick={() => router.push("/recroom/story-weaver/library")}
                  className="text-[10px] font-mono text-neon-purple hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recent.map((s) => (
                <StoryCard key={s.id} story={s}
                  onRead={(id) => router.push("/recroom/story-weaver/" + id)}
                  onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stories.length === 0 && !loading && (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-lg font-serif text-white/50 mb-2">Your story awaits</h3>
            <p className="text-sm text-white/25">Create your first story and let the adventure begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
