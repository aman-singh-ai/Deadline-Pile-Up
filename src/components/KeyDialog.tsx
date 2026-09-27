import { X, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { LlmConfig } from "../lib/llm";

interface Props {
  open: boolean;
  initial: LlmConfig;
  onClose: () => void;
  onSave: (cfg: LlmConfig) => void;
}

export default function KeyDialog({ open, initial, onClose, onSave }: Props) {
  const [cfg, setCfg] = useState<LlmConfig>(initial);

  useEffect(() => {
    if (open) setCfg(initial);
  }, [open, initial]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-2xl border border-line shadow-pop rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-paper-deep border border-line grid place-items-center">
              <KeyRound className="size-4 text-ink-soft" />
            </div>
            <h2 className="font-display font-semibold text-lg">Extraction settings</h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 grid place-items-center rounded-lg hover:bg-paper-deep text-ink-mute"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Bring your own OpenAI-compatible key. It is used{" "}
            <em className="font-medium text-ink">only</em> to extract dates and titles from
            pasted text — sorting and pile-up detection always run as plain code.
          </p>

          <label className="block">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-mute">
              API key
            </span>
            <input
              type="password"
              value={cfg.apiKey}
              onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value.trim() })}
              placeholder="sk-…"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-mute">
                Model
              </span>
              <input
                value={cfg.model}
                onChange={(e) => setCfg({ ...cfg, model: e.target.value.trim() })}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-mute">
                Base URL
              </span>
              <input
                value={cfg.baseUrl}
                onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value.trim() })}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
              />
            </label>
          </div>

          <div className="flex items-start gap-2 text-[12px] text-ink-mute bg-paper-deep/60 border border-line rounded-lg px-3 py-2.5">
            <ShieldCheck className="size-4 mt-0.5 shrink-0 text-ok" />
            Stored in this browser's localStorage only. Calls go straight from your browser to
            the API — nothing passes through a server.
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-paper-deep text-ink-soft"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(cfg);
              onClose();
            }}
            disabled={!cfg.apiKey || !cfg.model || !cfg.baseUrl}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-ink text-paper hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
