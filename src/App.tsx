import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  RefreshCcw,
  Sigma,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import TopBar from "./components/TopBar";
import KeyDialog from "./components/KeyDialog";
import InputStage from "./components/InputStage";
import PileupBanner from "./components/PileupBanner";
import Timeline from "./components/Timeline";
import DeadlineCard from "./components/DeadlineCard";
import {
  Candidate,
  DeadlineItem,
  computeView,
  splitBlocks,
  toLocalISO,
} from "./lib/deadlines";
import { demoExtract, SAMPLE_TEXT } from "./lib/sample";
import { DEFAULT_CONFIG, LlmConfig, extractWithLLM } from "./lib/llm";

type Stage = "input" | "results";

interface Meta {
  mode: "ai" | "demo";
  model?: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadCfg(): LlmConfig {
  try {
    const raw = localStorage.getItem("dpu.cfg");
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_CONFIG;
}

export default function App() {
  const [stage, setStage] = useState<Stage>("input");
  const [text, setText] = useState("");
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cfg, setCfg] = useState<LlmConfig>(loadCfg);
  const [keyOpen, setKeyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busySteps, setBusySteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const blocks = useMemo(() => splitBlocks(text), [text]);
  const view = useMemo(() => computeView(items), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // ── session persistence ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dpu.session");
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.items) && s.items.length) {
          setItems(s.items);
          setText(s.text ?? "");
          setMeta(s.meta ?? null);
          setStage("results");
        } else if (typeof s.text === "string") {
          setText(s.text);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dpu.session", JSON.stringify({ text, items, meta }));
    } catch {
      /* ignore */
    }
  }, [text, items, meta]);

  const saveCfg = (next: LlmConfig) => {
    setCfg(next);
    try {
      localStorage.setItem("dpu.cfg", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  // ── extraction ─────────────────────────────────────────────────────────────
  async function runExtraction(mode: "ai" | "demo") {
    if (blocks.length === 0 || blocks.length > 6 || busy) return;
    setError(null);
    setBusy(true);
    abortRef.current = new AbortController();

    const steps =
      mode === "ai"
        ? [
            `Sending ${blocks.length} brief${blocks.length > 1 ? "s" : ""} to ${cfg.model}…`,
            "Normalising dates + honesty checks (code)…",
            "Sorting + scanning 48-hour windows (pure code)…",
          ]
        : [
            "Simulating extraction (demo mode — no API key)…",
            "Normalising dates + honesty checks (code)…",
            "Sorting + scanning 48-hour windows (pure code)…",
          ];

    try {
      setBusySteps([steps[0]]);
      let result: DeadlineItem[];
      if (mode === "ai") {
        result = await extractWithLLM(blocks, cfg, abortRef.current.signal);
      } else {
        await wait(750);
        result = demoExtract(blocks);
      }
      setBusySteps([steps[0], steps[1]]);
      await wait(480);
      setBusySteps(steps);
      await wait(560);
      setItems(result);
      setMeta({ mode, model: mode === "ai" ? cfg.model : undefined });
      setStage("results");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message || "Extraction failed.");
      }
    } finally {
      setBusy(false);
      setBusySteps([]);
    }
  }

  // ── editing (re-runs deterministic clustering automatically) ───────────────
  const patchItem = (id: string, patch: Partial<DeadlineItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const confirmCandidate = (id: string, c: Candidate) => {
    const { datetime, timeAssumed } = toLocalISO(c.date, c.time);
    patchItem(id, { datetime, timeAssumed, uiStatus: "confirmed" });
  };

  const confirmProposed = (id: string) => patchItem(id, { uiStatus: "confirmed" });

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const reset = () => {
    abortRef.current?.abort();
    setStage("input");
    setItems([]);
    setMeta(null);
    setError(null);
    setText((t) => t); // keep pasted text so the user can tweak it
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen">
      <TopBar hasKey={!!cfg.apiKey} onOpenKey={() => setKeyOpen(true)} />
      <KeyDialog
        open={keyOpen}
        initial={cfg}
        onClose={() => setKeyOpen(false)}
        onSave={saveCfg}
      />

      {stage === "input" ? (
        <InputStage
          text={text}
          setText={setText}
          blockCount={blocks.length}
          hasKey={!!cfg.apiKey}
          busy={busy}
          busySteps={busySteps}
          error={error}
          onLoadSample={() => setText(SAMPLE_TEXT)}
          onExtractAI={() => runExtraction("ai")}
          onExtractDemo={() => runExtraction("demo")}
        />
      ) : (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 pb-16">
          {/* summary row */}
          <div className="rise flex flex-wrap items-center gap-2.5">
            <h2 className="font-display font-semibold text-2xl sm:text-[1.75rem] tracking-tight mr-2">
              Verified deadline list
            </h2>
            <Chip icon={ListChecks} tone="neutral">
              {view.stats.total} extracted
            </Chip>
            <Chip icon={CheckCircle2} tone="ok">
              {view.stats.verified} trusted
            </Chip>
            {view.stats.clarify > 0 && (
              <Chip icon={AlertTriangle} tone="warn">
                {view.stats.clarify} need{view.stats.clarify > 1 ? "" : "s"} your confirmation
              </Chip>
            )}
            {view.stats.undated > 0 && (
              <Chip icon={Sigma} tone="neutral">
                {view.stats.undated} undated
              </Chip>
            )}
            {meta?.mode === "demo" && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-full border border-warn-line bg-warn-tint text-warn">
                <Sparkles className="size-3" /> demo simulation — no AI call made
              </span>
            )}
            {meta?.mode === "ai" && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-full border border-ok-line bg-ok-tint text-ok">
                <Sparkles className="size-3" /> extracted with {meta.model}
              </span>
            )}
            <button
              onClick={reset}
              className="ml-auto inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-lg border border-line bg-card hover:border-ink/30 transition-all"
            >
              <RefreshCcw className="size-3.5" />
              New extraction
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 text-[12px] font-mono text-ink-mute rise">
            <ShieldAlert className="size-3.5 mt-0.5 shrink-0" />
            This list only flags crowded windows — it never re-plans your study time and never
            moves a deadline for you.
          </div>

          {/* pile-up flag */}
          <div className="mt-6">
            {view.pileups.length > 0 ? (
              <PileupBanner pileups={view.pileups} byId={byId} />
            ) : (
              <div className="rise rounded-2xl border border-ok-line bg-ok-tint px-5 py-4 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-ok" />
                <div>
                  <div className="font-semibold text-[14px] text-ok">No pile-up detected</div>
                  <div className="text-[12px] font-mono text-ok/80">
                    No 48-hour window holds 3 or more dated submissions. Confirmed clarifications
                    re-scan instantly.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* timeline */}
          <div className="mt-5 rise" style={{ animationDelay: "60ms" }}>
            <Timeline dated={view.dated} pileups={view.pileups} />
          </div>

          {/* editable list */}
          <div className="mt-8">
            <div className="flex items-baseline gap-3">
              <h3 className="font-display font-semibold text-xl">Deadlines, earliest first</h3>
              <span className="font-mono text-[11px] text-ink-mute">
                edits re-run the sort + cluster scan instantly
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4 items-start">
              {view.dated.map((item, i) => (
                <DeadlineCard
                  key={item.id}
                  item={item}
                  inPileup={view.pileupOf.has(item.id)}
                  delay={i * 55}
                  onChange={patchItem}
                  onConfirmCandidate={confirmCandidate}
                  onConfirmProposed={confirmProposed}
                  onRemove={removeItem}
                />
              ))}
            </div>

            {view.undated.length > 0 && (
              <>
                <div className="flex items-baseline gap-3 mt-10">
                  <h3 className="font-display font-semibold text-xl">Undated — parked outside the scan</h3>
                  <span className="font-mono text-[11px] text-ink-mute">
                    excluded from clustering until a date is confirmed
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4 items-start">
                  {view.undated.map((item, i) => (
                    <DeadlineCard
                      key={item.id}
                      item={item}
                      inPileup={false}
                      delay={i * 55}
                      onChange={patchItem}
                      onConfirmCandidate={confirmCandidate}
                      onConfirmProposed={confirmProposed}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </>
            )}

            {items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-card/60 px-6 py-10 text-center text-[13px] font-mono text-ink-mute">
                The list is empty — run a new extraction.
              </div>
            )}
          </div>

          {/* method footer */}
          <footer className="mt-14 border-t border-line pt-6 grid sm:grid-cols-3 gap-4 text-[12px] font-mono text-ink-mute leading-relaxed">
            <div>
              <span className="text-alarm font-bold">AI only:</span> turning messy prose into
              candidate dates, titles and matched quotes.
            </div>
            <div>
              <span className="text-ok font-bold">Code only:</span> chronological sort, sliding
              48-hour window scan, threshold of 3 submissions.
            </div>
            <div>
              <span className="text-ink font-bold">Never:</span> silent guesses for missing years,
              relative phrases or contradictions — those always ask you first.
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}

function Chip({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "ok" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-ok-line bg-ok-tint text-ok"
      : tone === "warn"
        ? "border-warn-line bg-warn-tint text-warn"
        : "border-line bg-paper text-ink-soft";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-mono font-semibold px-2.5 py-1.5 rounded-full border tnum ${cls}`}
    >
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}
