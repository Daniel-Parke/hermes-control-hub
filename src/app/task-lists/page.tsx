"use client";

import { useCallback, useEffect, useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { TaskListRecord } from "@/types/hermes";

export default function TaskListsPage() {
  const [items, setItems] = useState<TaskListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(() => {
    fetch("/api/task-lists")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.taskLists) setItems(d.data.taskLists);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/task-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        steps: [
          { title: "First step", schedule: "every 1h", missionTemplateId: "qa-bugfix" },
        ],
      }),
    });
    if (res.ok) {
      setName("");
      setDescription("");
      load();
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <PageHeader
        title="Task Lists"
        subtitle="Ordered recurring sequences. Execution uses a single coordinator cron job in Hermes (see platform docs); MC stores definitions under MC_DATA_DIR/task-lists."
        icon={ListTodo}
        color="orange"
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">New list</h2>
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button onClick={create}>
              <Plus className="mr-2 h-4 w-4" />
              Create starter list
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Saved</h2>
          {loading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-500">No task lists yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-zinc-300">
              {items.map((t) => (
                <li key={t.id} className="rounded border border-zinc-800 px-3 py-2">
                  <span className="font-medium text-zinc-100">{t.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {t.steps.length} steps
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
