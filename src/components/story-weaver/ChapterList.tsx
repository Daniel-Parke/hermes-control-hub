// ChapterList — Chapter sidebar for story reader
"use client";
import { CheckCircle2, Loader2, Clock, XCircle, BookOpen } from "lucide-react";

interface Chapter {
  number: number; title: string; status: string; wordCount: number; generatedAt?: string | null;
}

export default function ChapterList({ chapters, currentChapter, onSelect }: {
  chapters: Chapter[]; currentChapter: number; onSelect: (num: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-mono text-white/25 uppercase tracking-widest px-2 mb-2">Chapters</div>
      {chapters.map((ch) => (
        <button key={ch.number} onClick={() => ch.status === "complete" && onSelect(ch.number)}
          disabled={ch.status !== "complete"}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
            ch.number === currentChapter ? "bg-purple-500/10 border border-purple-500/20" : "hover:bg-white/[0.03]"
          } ${ch.status !== "complete" ? "opacity-50 cursor-default" : ""}`}>
          {ch.status === "complete" && <CheckCircle2 className="w-3.5 h-3.5 text-neon-green flex-shrink-0" />}
          {ch.status === "writing" && <Loader2 className="w-3.5 h-3.5 text-neon-purple animate-spin flex-shrink-0" />}
          {ch.status === "pending" && <Clock className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
          {ch.status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          <div className="min-w-0">
            <div className={`text-xs truncate ${ch.number === currentChapter ? "text-white" : "text-white/60"}`}>
              {ch.title}
            </div>
            <div className="text-[9px] font-mono text-white/20">
              {ch.status === "complete" ? `${ch.wordCount} words` : ch.status}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
