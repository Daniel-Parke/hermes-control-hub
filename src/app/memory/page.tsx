// ═══════════════════════════════════════════════════════════════
// Memory Manager — Browse, add, edit, delete holographic memory facts
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Database, Brain, HardDrive, Filter, Plus, Pencil, Trash2,
  Check, X, Save, AlertTriangle,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { LoadingSpinner, EmptyState, ErrorBanner } from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { MemoryData, MemoryFact } from "@/types/hermes";
import { formatBytes } from "@/lib/utils";

function getTrustColor(trust: number): "green" | "orange" | "red" {
  if (trust >= 0.8) return "green";
  if (trust >= 0.5) return "orange";
  return "red";
}

function TrustBar({ trust }: { trust: number }) {
  const pct = Math.round(trust * 100);
  const color = getTrustColor(trust);
  const barColor = {
    green: "bg-neon-green",
    orange: "bg-neon-orange",
    red: "bg-red-500",
  }[color];

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-white/40">{pct}%</span>
    </div>
  );
}

interface EditingFact {
  id: number | null; // null = new fact
  content: string;
  category: string;
  tags: string;
  trust: number;
}

function FactCard({
  fact,
  onEdit,
  onDelete,
}: {
  fact: MemoryFact;
  onEdit: (fact: MemoryFact) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-dark-900/50 p-4 hover:border-neon-pink/30 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Database className="w-4 h-4 text-neon-pink flex-shrink-0" />
          <Badge color="pink">{fact.category || "uncategorized"}</Badge>
          {fact.tags && (
            <Badge color="gray">{fact.tags}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TrustBar trust={fact.trust ?? 0} />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(fact)}
              className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-neon-cyan transition-colors"
              title="Edit fact"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(fact.id)}
              className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
              title="Delete fact"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{fact.content}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-white/20 font-mono">
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          ID: {fact.id}
        </span>
        {fact.created_at && (
          <span>Created: {new Date(fact.created_at).toLocaleDateString()}</span>
        )}
        {fact.updated_at && fact.updated_at !== fact.created_at && (
          <span>Updated: {new Date(fact.updated_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

function FactEditorModal({
  fact,
  onSave,
  onClose,
}: {
  fact: EditingFact;
  onSave: (fact: EditingFact) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState(fact.content);
  const [category, setCategory] = useState(fact.category);
  const [tags, setTags] = useState(fact.tags);
  const [trust, setTrust] = useState(fact.trust);

  const isNew = fact.id === null;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isNew ? "Add Memory Fact" : "Edit Memory Fact"}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-white/70 mb-1.5 block">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full bg-dark-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-neon-pink/50 transition-colors font-mono resize-y"
            placeholder="What should I remember?"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-dark-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-neon-pink/50 transition-colors font-mono"
              placeholder="general"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-dark-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-neon-pink/50 transition-colors font-mono"
              placeholder="tag1, tag2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">Trust Score</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={trust}
              onChange={(e) => setTrust(parseFloat(e.target.value) || 0)}
              className="w-full bg-dark-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-neon-pink/50 transition-colors font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} icon={X}>
            Cancel
          </Button>
          <Button
            variant="primary"
            color="pink"
            size="sm"
            onClick={() => onSave({ ...fact, content, category, tags, trust })}
            disabled={!content.trim()}
            icon={Save}
          >
            {isNew ? "Add Fact" : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteConfirmModal({
  factId,
  onConfirm,
  onClose,
}: {
  factId: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={true} onClose={onClose} title="Delete Memory Fact" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p>Are you sure you want to delete fact #{factId}? This action cannot be undone.</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose} icon={X}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} icon={Trash2}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function MemoryPage() {
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // CRUD state
  const [editingFact, setEditingFact] = useState<EditingFact | null>(null);
  const [deletingFactId, setDeletingFactId] = useState<number | null>(null);

  const { showToast, toastElement } = useToast();

  const loadData = useCallback(() => {
    setLoading(true);
    fetch("/api/memory")
      .then((res) => res.json())
      .then((d) => setData(d.data || d))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => {
    setEditingFact({ id: null, content: "", category: "general", tags: "", trust: 0.7 });
  };

  const handleEdit = (fact: MemoryFact) => {
    setEditingFact({
      id: fact.id,
      content: fact.content,
      category: fact.category || "general",
      tags: fact.tags || "",
      trust: fact.trust ?? 0.5,
    });
  };

  const handleSave = async (fact: EditingFact) => {
    try {
      if (fact.id === null) {
        // Create
        const res = await fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: fact.content,
            category: fact.category,
            tags: fact.tags,
            trust_score: fact.trust,
          }),
        });
        if (!res.ok) throw new Error("Failed to add fact");
        showToast("Fact added successfully", "success");
      } else {
        // Update
        const res = await fetch("/api/memory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: fact.id,
            content: fact.content,
            category: fact.category,
            tags: fact.tags,
            trust_score: fact.trust,
          }),
        });
        if (!res.ok) throw new Error("Failed to update fact");
        showToast("Fact updated successfully", "success");
      }
      setEditingFact(null);
      loadData();
    } catch {
      showToast("Failed to save fact", "error");
    }
  };

  const handleDelete = async () => {
    if (deletingFactId === null) return;
    try {
      const res = await fetch(`/api/memory?id=${deletingFactId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete fact");
      showToast("Fact deleted", "success");
      setDeletingFactId(null);
      loadData();
    } catch {
      showToast("Failed to delete fact", "error");
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    if (!data?.facts) return [];
    const cats = new Set<string>();
    for (const f of data?.facts || []) {
      cats.add(f.category || "uncategorized");
    }
    return Array.from(cats).sort();
  }, [data?.facts]);

  const filteredFacts =
    data?.facts.filter((fact) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !fact.content?.toLowerCase().includes(q) &&
          !fact.category?.toLowerCase().includes(q) &&
          !fact.tags?.toLowerCase().includes(q)
        ) return false;
      }
      if (categoryFilter && (fact.category || "uncategorized") !== categoryFilter) {
        return false;
      }
      return true;
    }) || [];

  // Show notice when holographic memory is not installed
  if (!loading && data && data.available === false) {
    return (
      <div className="min-h-screen bg-dark-950 grid-bg">
        <PageHeader
          icon={Brain}
          title="Holographic Memory"
          subtitle="Memory Provider"
          color="pink"
        />
        <div className="px-6 py-12">
          <div className="max-w-lg mx-auto text-center rounded-xl border border-pink-500/20 bg-dark-900/50 p-8">
            <Brain className="w-12 h-12 text-pink-400/40 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Holographic Memory Not Installed</h2>
            <p className="text-sm text-white/50 mb-4">
              {data.message || "This feature requires the hermes-memory-store plugin with the holographic memory provider."}
            </p>
            <p className="text-xs text-white/30 font-mono">
              Install via: hermes plugins install hermes-memory-store
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 grid-bg">
      <PageHeader
        icon={Brain}
        title="Holographic Memory"
        subtitle={`${data?.total || 0} stored facts — ${formatBytes(data?.dbSize || 0)}`}
        color="pink"
        actions={
          <Button variant="primary" color="pink" size="sm" onClick={handleAdd} icon={Plus}>
            Add Fact
          </Button>
        }
      />

      <div className="px-6 py-6">
        {data?.error && <ErrorBanner message={data.error} />}

        {/* Search + Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search memory facts..."
              accentColor="pink"
            />
          </div>
          {categories.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-white/30 flex-shrink-0" />
              <button
                onClick={() => setCategoryFilter(null)}
                className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                  !categoryFilter
                    ? "bg-neon-pink/20 text-neon-pink"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                All ({data?.facts?.length || 0})
              </button>
              {categories.map((cat) => {
                const count = data?.facts?.filter((f) => (f.category || "uncategorized") === cat).length || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                      categoryFilter === cat
                        ? "bg-neon-pink/20 text-neon-pink"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading memory..." />
        ) : filteredFacts.length === 0 && !data?.error ? (
          <EmptyState
            icon={Brain}
            title="No memory facts found"
            description={search || categoryFilter ? "Try a different filter" : "Memory store is empty — click Add Fact to create one"}
          />
        ) : (
          <>
            <div className="text-xs text-white/30 font-mono mb-3">
              Showing {filteredFacts.length} of {data?.total || 0} facts
            </div>
            <div className="grid gap-3">
              {filteredFacts.map((fact) => (
                <FactCard
                  key={fact.id}
                  fact={fact}
                  onEdit={handleEdit}
                  onDelete={setDeletingFactId}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {editingFact && (
        <FactEditorModal
          fact={editingFact}
          onSave={handleSave}
          onClose={() => setEditingFact(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingFactId !== null && (
        <DeleteConfirmModal
          factId={deletingFactId}
          onConfirm={handleDelete}
          onClose={() => setDeletingFactId(null)}
        />
      )}

      {toastElement}
    </div>
  );
}
