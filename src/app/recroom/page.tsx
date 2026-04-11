// Rec Room Hub — Simplified (Story Weaver focus)
"use client";
import Link from "next/link";
import { BookOpen, Gamepad2, ChevronRight } from "lucide-react";

export default function RecRoomHub() {
  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines">
      <div className="border-b border-white/10 bg-dark-900/50 px-6 py-5 backdrop-blur-xl border-t-2 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-6 h-6 text-neon-purple" />
          <div>
            <h1 className="text-xl font-bold text-white">Rec Room</h1>
            <p className="text-xs text-white/40 font-mono">Creative activities powered by your agent</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-sm text-white/50 mb-10 max-w-xl leading-relaxed">
          The Rec Room is a creative playground. More activities coming soon — for now, dive into Story Weaver.
        </p>
        <Link href="/recroom/story-weaver"
          className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-dark-900/50 p-6 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] transition-all group">
          <div className="flex items-center gap-4">
            <BookOpen className="w-8 h-8 text-neon-purple" />
            <div>
              <h2 className="text-lg font-semibold text-white">Story Weaver</h2>
              <p className="text-sm text-white/40">Collaborative interactive fiction — build worlds, write chapters, steer the narrative</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
