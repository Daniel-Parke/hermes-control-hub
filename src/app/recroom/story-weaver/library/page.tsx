// Story Weaver — Library
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Sparkles } from "lucide-react";
import StoryCard from "@/components/story-weaver/StoryCard";

export default function LibraryPage() {
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
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
    if (!confirm("Delete this story permanently?")) return;
    await fetch("/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", storyId: id }),
    });
    fetchStories();
  };

  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines">
      <div className="border-b border-white/10 bg-dark-900/50 px-6 py-5 backdrop-blur-xl border-t-2 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/recroom/story-weaver")} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5"><ChevronLeft className="w-4 h-4" /></button>
            <div>
              <h1 className="text-lg font-bold text-white">📚 Library</h1>
              <p className="text-xs text-white/40 font-mono">{stories.length} {stories.length === 1 ? "story" : "stories"}</p>
            </div>
          </div>
          <button onClick={() => router.push("/recroom/story-weaver/create")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-500/30 text-sm font-mono text-neon-purple hover:bg-purple-500/10">
            <Plus className="w-4 h-4" /> New Story
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-16"><Sparkles className="w-8 h-8 text-white/10 animate-pulse mx-auto" /></div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-lg font-serif text-white/50 mb-2">Your library is empty</h3>
            <p className="text-sm text-white/25 mb-6">Create your first story to get started.</p>
            <button onClick={() => router.push("/recroom/story-weaver/create")}
              className="px-6 py-3 rounded-xl border border-purple-500/30 text-sm font-mono text-neon-purple hover:bg-purple-500/10">
              Create a Story
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s}
                onRead={(id) => router.push("/recroom/story-weaver/" + id)}
                onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
