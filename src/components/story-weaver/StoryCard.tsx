// StoryCard — Library card for a story
"use client";
import { BookOpen, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface StoryCardProps {
  story: {
    id: string; title: string; premise?: string; status?: string;
    chapters?: { number: number; title: string; status: string; wordCount: number }[];
    config?: { genre?: string }; createdAt?: string; updatedAt?: string;
  };
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function StoryCard({ story, onRead, onDelete }: StoryCardProps) {
  const totalWords = (story.chapters || []).reduce((sum, c) => sum + (c.wordCount || 0), 0);
  const completeChapters = (story.chapters || []).filter(c => c.status === "complete").length;
  const totalChapters = (story.chapters || []).length;
  const isComplete = story.status === "complete" || (totalChapters > 0 && completeChapters === totalChapters);

  return (
    <div className="rounded-xl border border-purple-500/15 bg-dark-900/50 p-5 hover:border-purple-500/30 transition-all group flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white/90 truncate">{story.title}</h3>
          <div className="text-[10px] font-mono text-white/25 mt-0.5">
            {story.config?.genre || "General"} · {timeAgo(story.updatedAt || story.createdAt || "")}
          </div>
        </div>
        <div className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${isComplete ? "bg-green-500/10 text-neon-green" : "bg-purple-500/10 text-neon-purple"}`}>
          {isComplete ? "Complete" : `${completeChapters}/${totalChapters}`}
        </div>
      </div>
      {story.premise && (
        <p className="text-xs text-white/30 leading-relaxed line-clamp-2 mb-3 flex-1">{story.premise}</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
        <span className="text-[10px] font-mono text-white/20">{totalWords.toLocaleString()} words</span>
        <div className="flex gap-1.5">
          <button onClick={() => onRead(story.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-purple-500/20 text-[10px] font-mono text-neon-purple hover:bg-purple-500/10 transition-colors">
            <BookOpen className="w-3 h-3" /> Read
          </button>
          <button onClick={() => onDelete(story.id)}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
