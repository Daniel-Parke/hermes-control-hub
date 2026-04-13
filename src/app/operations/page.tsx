"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, Plus, ChevronRight, Pause, Play, Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { OperationRecord } from "@/types/hermes";

export default function OperationsPage() {
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stepTitles, setStepTitles] = useState("Plan\nExecute\nVerify");
  const [stepTemplateIds, setStepTemplateIds] = useState("");
  const [stepModels, setStepModels] = useState("");
  const { showToast, toastElement } = useToast();

  const load = useCallback(() => {
    fetch("/api/operations")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.operations) setOperations(d.data.operations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      showToast("Name required", "error");
      return;
    }
    const titles = stepTitles
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    const tmplLines = stepTemplateIds.split("\n");
    const modelLines = stepModels.split("\n");
    const steps = titles.map((title, i) => ({
      title,
      missionTemplateId: tmplLines[i]?.trim() || undefined,
      model: modelLines[i]?.trim() || undefined,
    }));
    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim(), steps }),
    });
    if (res.ok) {
      showToast("Operation created", "success");
      setName("");
      setDescription("");
      setStepTitles("Plan\nExecute\nVerify");
      setStepTemplateIds("");
      setStepModels("");
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      showToast(j.error || "Create failed", "error");
    }
  };

  const act = async (id: string, action: string) => {
    const res = await fetch("/api/operations/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      showToast("Updated", "success");
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      showToast(j.error || "Failed", "error");
    }
  };

  const dispatchStep = async (id: string) => {
    const res = await fetch("/api/operations/" + id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dispatchCurrentStep" }),
    });
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      showToast("Mission saved: " + (j.data?.missionId || "ok"), "success");
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      showToast(j.error || "Dispatch failed", "error");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      {toastElement}
      <PageHeader
        title="Operations"
        subtitle="Multi-step sequences. Hermes enforces delegation limits (e.g. ≤3 sub-agents per policy). Dispatch saves a mission file from the current step’s built-in template; advance moves the pointer."
        icon={GitBranch}
        color="purple"
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">New operation</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Name</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Release checklist"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Description</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Steps (one title per line)
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm"
                value={stepTitles}
                onChange={(e) => setStepTitles(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Optional: built-in template id per line (same order as steps), e.g. qa-bugfix
              </label>
              <textarea
                className="min-h-[72px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs"
                value={stepTemplateIds}
                onChange={(e) => setStepTemplateIds(e.target.value)}
                placeholder={"qa-bugfix\n\n"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Optional: model override per line (same order; empty = config default)
              </label>
              <textarea
                className="min-h-[48px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs"
                value={stepModels}
                onChange={(e) => setStepModels(e.target.value)}
                placeholder=""
              />
            </div>
            <Button onClick={create}>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Saved operations</h2>
          {loading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : operations.length === 0 ? (
            <p className="text-zinc-500">No operations yet.</p>
          ) : (
            <ul className="space-y-3">
              {operations.map((op) => (
                <li
                  key={op.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-100">{op.name}</p>
                      <p className="text-xs text-zinc-500">
                        {op.status} · step {op.currentStepIndex + 1}/{op.steps.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => dispatchStep(op.id)}
                        disabled={
                          op.status === "completed" ||
                          op.currentStepIndex >= op.steps.length
                        }
                      >
                        Dispatch step
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => act(op.id, "advance")}
                        disabled={op.status === "completed"}
                      >
                        <ChevronRight className="mr-1 h-3 w-3" />
                        Advance
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => act(op.id, "back")}
                        disabled={op.currentStepIndex === 0}
                      >
                        Back
                      </Button>
                      {op.status === "paused" ? (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          onClick={() => act(op.id, "resume")}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Resume
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          onClick={() => act(op.id, "pause")}
                          disabled={op.status === "completed"}
                        >
                          <Pause className="mr-1 h-3 w-3" />
                          Pause
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        className="text-xs text-red-400"
                        onClick={() => {
                          if (confirm("Delete this operation?")) act(op.id, "delete");
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Dispatch work from{" "}
                    <Link href="/missions" className="text-cyan-400 underline">
                      Missions
                    </Link>
                    ; use mission prompts to invoke Hermes{" "}
                    <code className="text-zinc-400">delegate_task</code> across teams.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
