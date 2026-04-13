"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { WorkspaceEntry } from "@/types/hermes";

export default function WorkspacesPage() {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.workspaces) setEntries(d.data.workspaces);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), path: path.trim() }),
    });
    if (res.ok) {
      setLabel("");
      setPath("");
      load();
    }
  };

  const remove = async (id: string) => {
    await fetch("/api/workspaces?id=" + encodeURIComponent(id), {
      method: "DELETE",
    });
    load();
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <PageHeader
        title="Workspaces"
        subtitle="Allowlisted extra repository paths (must resolve under your home directory, HERMES_HOME, or MC_DATA_DIR)."
        icon={FolderOpen}
        color="cyan"
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Register path</h2>
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              placeholder="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs"
              placeholder="Absolute path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
            <Button onClick={add}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Registry</h2>
          {loading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-zinc-500">No workspaces registered.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-2 rounded border border-zinc-800 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-zinc-100">{e.label}</div>
                    <div className="font-mono text-xs text-zinc-400 break-all">
                      {e.path}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(e.id)}
                    className="text-red-400 hover:text-red-300"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
