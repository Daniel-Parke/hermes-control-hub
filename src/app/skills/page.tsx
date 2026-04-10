// ═══════════════════════════════════════════════════════════════
// Skills Manager — Browse installed skills by category
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  FolderOpen,
  ChevronRight,
  Clock,
  HardDrive,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { LoadingSpinner, EmptyState } from "@/components/ui/LoadingSpinner";
import type { SkillsData } from "@/types/hermes";

export default function SkillsPage() {
  const [data, setData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((res) => res.json())
      .then((d) => setData(d.data))
      .finally(() => setLoading(false));
  }, []);

  const filteredSkills =
    data?.skills.filter((skill) => {
      const matchesSearch =
        !search ||
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !selectedCategory || skill.category.startsWith(selectedCategory);
      return matchesSearch && matchesCategory;
    }) || [];

  return (
    <div className="min-h-screen bg-dark-950 grid-bg">
      <PageHeader
        icon={FileText}
        title="Skills Manager"
        subtitle={`${data?.total || 0} skills across ${data?.categoryCount || 0} categories`}
        color="green"
      />

      <div className="px-6 py-6">
        {/* Search */}
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search skills..."
            accentColor="green"
          />
        </div>

        {loading ? (
          <LoadingSpinner text="Loading skills..." />
        ) : (
          <div className="flex gap-6">
            {/* Categories Sidebar */}
            <div className="w-56 flex-shrink-0 hidden md:block">
              <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">
                Categories
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedCategory
                      ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  All Skills ({data?.total || 0})
                </button>
                {data &&
                  Object.entries(data.categories)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, skills]) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                          selectedCategory === category
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                            : "text-white/60 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5" />
                          {category}
                        </span>
                        <span className="text-xs text-white/30">
                          {skills.length}
                        </span>
                      </button>
                    ))}
              </div>
            </div>

            {/* Skills List */}
            <div className="flex-1">
              {filteredSkills.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No skills found"
                  description={search ? "Try a different search term" : "No skills installed"}
                />
              ) : (
                <div className="grid gap-3">
                  {filteredSkills.map((skill) => {
                    // Derive URL path from skill path
                    const relPath = skill.path
                      .replace(/.*\/skills\//, "")
                      .replace(/\/SKILL\.md$/, "");
                    return (
                    <Link key={skill.path} href={`/skills/${relPath}`}>
                      <div
                        className="rounded-xl border border-white/10 bg-dark-900/50 p-4 hover:border-neon-green/30 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-neon-green" />
                              <h3 className="font-semibold text-white">
                                {skill.name}
                              </h3>
                              <span className="text-xs text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded">
                                {skill.category}
                              </span>
                            </div>
                            <p className="text-sm text-white/50 line-clamp-2">
                              {skill.description || "No description available"}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-white/30 font-mono">
                              <span className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3" />
                                {(skill.size / 1024).toFixed(1)} KB
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(skill.lastModified).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-white/30 group-hover:text-neon-green transition-colors font-mono">
                            VIEW
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
