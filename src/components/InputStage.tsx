import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Loader2,
  Sparkles,
  Sigma,
  UserCheck,
  Wand2,
  FileText,
} from "lucide-react";

interface Props {
  text: string;
  setText: (t: string) => void;
  blockCount: number;
  hasKey: boolean;
  busy: boolean;
  busySteps: string[];
  error: string | null;
  onLoadSample: () => void;
  onExtractAI: () => void;
  onExtractDemo: () => void;
}

const PIPELINE = [
  {
    icon: Sparkles,
    title: "AI extracts",
    body: "Dates & titles pulled from messy prose. Ambiguity is flagged, never guessed silently.",
  },
  {
    icon: Sigma,
    title: "Code computes",
    body: "Chronological sort + a deterministic 48-hour sliding-window scan for 3+ submissions.",
  },
  {
    icon: UserCheck,
    title: "You verify",
    body: "Every unclear date asks you a direct question. You confirm — the list stays honest.",
  },
];

export default function InputStage(p: Props) {
  const overLimit = p.blockCount > 6;
  const canExtract = p.blockCount >= 1 && !overLimit && !p.busy;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
      {/* hero */}
      <div className="rise" style={{ animationDelay: "40ms" }}>
        <p className="font-mono text-[11px] tracking-[0.22em] text-alarm font-semibold uppercase">
          Hackathon prototype · Problem 02
        </p>
        <h1 className="font-display font-semibold text-[2.6rem] leading-[1.04] sm:text-6xl tracking-tight mt-3">
          Catch the deadline
          <br />
          pile-up <span className="italic text-alarm">before</span> it
          <br className="hidden sm:block" /> catches you.
        </h1>
        <p className="mt-4 text-[15px] sm:text-base text-ink-soft max-w-xl leading-relaxed">
          Paste up to six assignment announcements. AI pulls out the deadlines —{" "}
          <strong className="text-ink font-semibold">plain code</strong> sorts them and flags any
          48-hour window carrying three or more submissions.
        </p>
      </div>

      {/* pipeline strip */}
      <div
        className="grid sm:grid-cols-3 gap-2.5 mt-8 rise"
        style={{ animationDelay: "120ms" }}
      >
        {PIPELINE.map((s) => (
          <div
            key={s.title}
            className="bg-card border border-line rounded-xl px-4 py-3.5 shadow-card flex gap-3"
          >
            <div className="size-8 shrink-0 rounded-lg bg-paper-deep border border-line grid place-items-center">
              <s.icon className="size-4 text-ink-soft" />
            </div>
            <div>
              <div className="text-[13px] font-semibold">{s.title}</div>
              <div className="text-[12px] text-ink-mute leading-snug mt-0.5">{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* paste card */}
      <div
        className="mt-6 bg-card border border-line rounded-2xl shadow-card overflow-hidden rise"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4">
          <label className="flex items-center gap-2 text-[13px] font-semibold">
            <FileText className="size-4 text-ink-soft" />
            Paste up to six announcements
            <span className="text-ink-mute font-normal hidden sm:inline">
              — separate each with one blank line
            </span>
          </label>
          <span
            className={`font-mono text-[11px] px-2 py-1 rounded-md border tnum ${
              overLimit
                ? "bg-alarm-tint border-alarm-line text-alarm-ink font-semibold"
                : "bg-paper border-line text-ink-mute"
            }`}
          >
            {p.blockCount} / 6 briefs
          </span>
        </div>

        <div className="px-4 sm:px-5 pt-3 relative">
          <textarea
            value={p.text}
            onChange={(e) => p.setText(e.target.value)}
            disabled={p.busy}
            spellCheck={false}
            placeholder={
              "CS201 - Assignment 4 due Fri 13 March, 5:00 pm…\n\nMATH 204 — Problem Set 7 due next Friday…\n\n(paste up to 5 more, one blank line between each)"
            }
            className="w-full h-56 sm:h-64 resize-y rounded-xl border border-line bg-paper px-4 py-3.5 font-mono text-[13px] leading-relaxed text-ink placeholder:text-ink-mute/70 focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/10 disabled:opacity-60"
          />
          {p.busy && (
            <div className="absolute inset-0 mx-4 sm:mx-5 mt-3 rounded-xl bg-card/92 backdrop-blur-[2px] grid place-items-center border border-line">
              <div className="w-full max-w-sm px-6">
                {p.busySteps.map((s, i) => (
                  <div key={s} className="flex items-center gap-3 py-2">
                    {i === p.busySteps.length - 1 ? (
                      <Loader2 className="size-4 animate-spin text-alarm" />
                    ) : (
                      <span className="size-4 rounded-full bg-ok/15 text-ok grid place-items-center">
                        <Check className="size-2.5" strokeWidth={3.5} />
                      </span>
                    )}
                    <span
                      className={`text-[13px] font-mono ${
                        i === p.busySteps.length - 1 ? "text-ink font-medium" : "text-ink-mute"
                      }`}
                    >
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {overLimit && (
          <div className="mx-4 sm:mx-5 mt-3 flex items-start gap-2 text-[12.5px] text-alarm-ink bg-alarm-tint border border-alarm-line rounded-lg px-3 py-2.5">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            Six briefs maximum — you have {p.blockCount}. Merge or remove blocks; keep one blank
            line between announcements.
          </div>
        )}
        {p.error && (
          <div className="mx-4 sm:mx-5 mt-3 flex items-start gap-2 text-[12.5px] text-alarm-ink bg-alarm-tint border border-alarm-line rounded-lg px-3 py-2.5">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>
              {p.error}{" "}
              {!p.hasKey && <span className="font-semibold">You can still run the offline demo below.</span>}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 px-4 sm:px-5 py-4">
          <button
            onClick={p.onLoadSample}
            disabled={p.busy}
            className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2.5 rounded-lg border border-line bg-paper hover:border-ink/30 transition-all disabled:opacity-50"
          >
            <ClipboardPaste className="size-4 text-ink-soft" />
            Load 6 sample announcements
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            {!p.hasKey && (
              <button
                onClick={p.onExtractDemo}
                disabled={!canExtract}
                className="inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-ink/20 bg-card hover:border-ink/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Wand2 className="size-4" />
                Demo extraction (no key)
              </button>
            )}
            <button
              onClick={p.onExtractAI}
              disabled={!canExtract || !p.hasKey}
              title={p.hasKey ? "Extract with the LLM" : "Add an API key in Settings first"}
              className="inline-flex items-center gap-2 text-[13px] font-semibold px-4.5 py-2.5 rounded-lg bg-alarm text-white hover:bg-alarm-deep shadow-card transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="size-4" />
              Extract deadlines{p.hasKey ? " with AI" : ""}
            </button>
          </div>
        </div>
      </div>

      <p
        className="text-center text-[12px] font-mono text-ink-mute mt-6 rise"
        style={{ animationDelay: "280ms" }}
      >
        exactly two features · no study planner · no auto-rescheduling · nothing guessed silently
      </p>
    </div>
  );
}
