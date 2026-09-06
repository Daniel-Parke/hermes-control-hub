// ═══════════════════════════════════════════════════════════════
// model-readiness — the one answer to "do I have a model?"
// ═══════════════════════════════════════════════════════════════
//
// Three screens used to answer this question and no two of them agreed.
// Chat ANDed the models registry's agent slot with the agent's config file,
// the dashboard ORed the same two, and the Models page read only the
// registry. On the install this was found on (config file names MiniMax-M3,
// registry slot empty) chat showed "Model not ready for chat" above a chat
// that worked perfectly, the dashboard named the model, and the Models page
// said "No default set".
//
// THE RULE. What the agent can call is what its config file names, because
// that file is what the gateway reads. Nothing the product sends changes it:
// an agent turn carries no model at all, and a fast turn carries the id from
// the chat dropdown, which the gateway resolves against the same file.
//
// The registry's agent slot is therefore NOT a second opinion about whether a
// model exists. It is an intent: setting it writes through to the config file,
// and a slot that has not reached the file is its own state ("not-sent"),
// which is a thing to say rather than a synonym for "no model at all".
//
// Pure and client-safe on purpose: the server applies it once, in
// GET /api/models/defaults, and the three screens read the answer. Keeping the
// function importable from a component would let a fourth opinion grow, so the
// module exports the rule and the shape and no I/O of its own.
// ═══════════════════════════════════════════════════════════════

type ModelReadinessState =
  /** The agent's config file names a model. It can answer. */
  | "ready"
  /** A model is chosen in the registry but has not reached the config file. */
  | "not-sent"
  /** Nothing is chosen anywhere. */
  | "none";

export interface ModelReadinessInput {
  /** `model.default` from the agent's config file: what the gateway will call. */
  configModel: string;
  /** `model.provider` from the same file. May be empty. */
  configProvider: string;
  /** Display name of the model in the registry's agent slot, or null when unset. */
  registryLabel: string | null;
}

export interface ModelReadiness {
  state: ModelReadinessState;
  /** True only when the agent has a model it can call right now. */
  ready: boolean;
  /** The model named for a header or a pill. "-" when there is none. */
  label: string;
  /** The bare model name, for use inside a sentence. "" when there is none. */
  modelName: string;
  /** One sentence saying what is wrong and what it means. "" when ready. */
  detail: string;
}

/**
 * Resolve the single readiness answer from the two facts that bear on it.
 *
 * Copy note: `detail` deliberately does not name a screen. It is rendered on
 * the Models page (where naming that page would be silly) and in the chat
 * banner (which carries a link to it), so the sentence says what happened and
 * the surface says where to go.
 */
export function resolveModelReadiness(input: ModelReadinessInput): ModelReadiness {
  const configModel = input.configModel.trim();
  const configProvider = input.configProvider.trim();
  const registryLabel = input.registryLabel?.trim() || "";

  if (configModel) {
    return {
      state: "ready",
      ready: true,
      label: configProvider ? `${configModel} · ${configProvider}` : configModel,
      modelName: configModel,
      detail: "",
    };
  }

  if (registryLabel) {
    return {
      state: "not-sent",
      ready: false,
      label: `${registryLabel} · not sent to the agent yet`,
      modelName: registryLabel,
      detail:
        `${registryLabel} is chosen but has not reached the agent yet. ` +
        "Set the default model again to send it across.",
    };
  }

  return {
    state: "none",
    ready: false,
    label: "-",
    modelName: "",
    detail:
      "No model has been set up yet, so the agent has nothing to answer with. " +
      "Add one and set it as the default.",
  };
}

/**
 * Pull the two config-file fields out of a parsed config document.
 *
 * The `model` key has been both a bare string and an object across versions of
 * the file, and every caller that read it grew its own handling of that. It
 * lives here so the rule and its inputs are read the same way once.
 */
export function modelFieldsFromConfig(
  config: unknown,
): { configModel: string; configProvider: string } {
  const modelField = (config as { model?: unknown } | null | undefined)?.model;
  if (typeof modelField === "string") {
    return { configModel: modelField.trim(), configProvider: "" };
  }
  if (modelField && typeof modelField === "object") {
    const record = modelField as Record<string, unknown>;
    return {
      configModel: String(record.default ?? "").trim(),
      configProvider: String(record.provider ?? "").trim(),
    };
  }
  return { configModel: "", configProvider: "" };
}
