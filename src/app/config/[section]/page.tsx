// ═══════════════════════════════════════════════════════════════
// Config Section Editor — Dynamic form for any config section
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Save, Check, Loader2, RotateCcw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { Toggle, Select, NumberInput, TextInput } from "@/components/ui/Input";
import { LoadingSpinner, ErrorBanner } from "@/components/ui/LoadingSpinner";
import { getSectionDef, type FieldDef } from "@/lib/config-schema";
import { iconColorMap } from "@/lib/theme";

export default function ConfigSectionPage() {
  const params = useParams();
  const sectionId = params.section as string;
  const sectionDef = getSectionDef(sectionId);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to load config");
      const json = await res.json();
      const config = json.data || json;
      const sectionValues = (config[sectionId] as Record<string, unknown>) || {};
      setValues(sectionValues);
      setOriginalValues({ ...sectionValues });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!sectionDef) return;
    // Only save editable fields
    const editableKeys = sectionDef.fields.map((f) => f.key);
    const editableValues: Record<string, unknown> = {};
    for (const key of editableKeys) {
      if (key in values) {
        editableValues[key] = values[key];
      }
    }

    setSaving(true);
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: sectionId, values: editableValues }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setOriginalValues({ ...values });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setValues({ ...originalValues });
  };

  const hasChanges = JSON.stringify(values) !== JSON.stringify(originalValues);

  const updateValue = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  if (!sectionDef) {
    return (
      <div className="min-h-screen bg-dark-950 grid-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Unknown Config Section
          </h2>
          <p className="text-white/40 font-mono mb-4">
            Section &quot;{sectionId}&quot; not found
          </p>
          <Link href="/config" className="text-neon-cyan text-sm font-mono hover:underline">
            ← Back to Config
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 grid-bg flex items-center justify-center">
        <LoadingSpinner text={`Loading ${sectionDef.label}...`} />
      </div>
    );
  }

  const renderField = (field: FieldDef) => {
    const value = values[field.key];

    switch (field.type) {
      case "boolean":
        return (
          <Toggle
            key={field.key}
            label={field.label}
            value={Boolean(value)}
            onChange={(v) => updateValue(field.key, v)}
            description={field.description}
            color={sectionDef.color}
          />
        );
      case "number":
        return (
          <NumberInput
            key={field.key}
            label={field.label}
            value={typeof value === "number" ? value : 0}
            onChange={(v) => updateValue(field.key, v)}
            min={field.min}
            max={field.max}
            description={field.description}
          />
        );
      case "select":
        return (
          <Select
            key={field.key}
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => updateValue(field.key, v)}
            options={field.options || []}
            description={field.description}
            color={sectionDef.color}
          />
        );
      case "textarea":
        return (
          <div key={field.key} className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-white/40">{field.description}</p>
            )}
            <textarea
              value={typeof value === "string" ? value : ""}
              onChange={(e) => updateValue(field.key, e.target.value)}
              rows={4}
              className="w-full bg-dark-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-neon-cyan/50 transition-colors font-mono resize-y"
            />
          </div>
        );
      default:
        return (
          <TextInput
            key={field.key}
            label={field.label}
            value={typeof value === "string" ? value : String(value ?? "")}
            onChange={(v) => updateValue(field.key, v)}
            description={field.description}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 grid-bg">
      {/* Header */}
      <header className="border-b border-white/10 bg-dark-900/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/config"
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-mono">CONFIG</span>
              </Link>
              <div className="w-px h-6 bg-white/20" />
              <div>
                <h1 className={`text-lg font-bold flex items-center gap-2 ${iconColorMap[sectionDef.color]}`}>
                  {sectionDef.label}
                </h1>
                <p className="text-xs text-white/40 font-mono">
                  {sectionDef.description}
                </p>
              </div>
            </div>
            {sectionDef.fields.length > 0 && (
              <div className="flex items-center gap-3">
                {hasChanges && (
                  <span className="text-xs text-neon-orange font-mono flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    UNSAVED
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={!hasChanges}
                  icon={RotateCcw}
                >
                  Reset
                </Button>
                <Button
                  variant="primary"
                  color={sectionDef.color}
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  loading={saving}
                  icon={saveStatus === "saved" ? Check : Save}
                >
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                    ? "Saved!"
                    : "Save"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {error && <ErrorBanner message={error} />}

        {/* Editable fields */}
        {sectionDef.fields.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-dark-900/50 p-6 space-y-5 mb-6">
            {sectionDef.fields.map(renderField)}
          </div>
        )}

        {/* Complex / nested fields (read-only preview) */}
        {sectionDef.complexKeys && sectionDef.complexKeys.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-dark-900/50 p-6">
            {sectionDef.fields.length > 0 && (
              <p className="text-xs text-white/30 font-mono uppercase tracking-widest mb-4">
                Complex Fields
              </p>
            )}
            <div className="space-y-4">
              {sectionDef.complexKeys.map((key) => {
                const val = values[key];
                const isObj = typeof val === "object" && val !== null;
                const isEmpty = !val || (isObj && Object.keys(val as object).length === 0);
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm text-white/60 font-mono">{key}</span>
                      {isEmpty && (
                        <span className="text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                          empty
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/30 bg-dark-800/50 rounded-lg p-3 font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                      {isEmpty
                        ? "(not configured)"
                        : isObj
                        ? JSON.stringify(val, null, 2)
                        : String(val)}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-white/20 mt-4 pt-4 border-t border-white/5">
              Edit complex fields in{" "}
              <Link
                href="/config"
                className="text-neon-cyan hover:underline"
              >
                config.yaml raw editor
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
