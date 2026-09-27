import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FileText,
  Flag,
  PencilLine,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Candidate,
  DeadlineItem,
  RawStatus,
  fmtShort,
  fmtTime,
  relativeLabel,
  subjectStyle,
} from "../lib/deadlines";
import { cn } from "../utils/cn";

interface Props {
  item: DeadlineItem;
  inPileup: boolean;
  delay?: number;
  onChange: (id: string, patch: Partial<DeadlineItem>) => void;
  onConfirmCandidate: (id: string, c: Candidate) => void;
  onConfirmProposed: (id: string) => void;
  onRemove: (id: string) => void;
}

const AI_LABEL: Record<RawStatus, string> = {
  ok: "Explicit date",
  missing_year: "Year missing",
  relative_date: "Relative date",
  ambiguous_format: "Ambiguous date",
  conflicting: "Conflicting dates",
  none_found: "No date found",
};

export default function DeadlineCard({
  item,
  inPileup,
  delay = 0,
  onChange,
  onConfirmCandidate,
  onConfirmProposed,
  onRemove,
}: Props) {
  const [showSource, setShowSource] = useState(false);
  const s = subjectStyle(item.subject);
  const clarify = item.uiStatus === "clarify";

  const source = useMemo(() => {
    if (!item.matchedText) return { pre: item.originalText, hit: "", post: "" };
    const idx = item.originalText.toLowerCase().indexOf(item.matchedText.toLowerCase());
    if (idx < 0) return { pre: item.originalText, hit: "", post: "" };
    return {
      pre: item.originalText.slice(0, idx),
      hit: item.originalText.slice(idx, idx + item.matchedText.length),
      post: item.originalText.slice(idx + item.matchedText.length),
    };
  }, [item.originalText, item.matchedText]);

  return (
    <article
      className={cn(
        "rise rounded-2xl border bg-card shadow-card transition-colors overflow-hidden",
        inPileup ? "border-alarm-line" : "border-line"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {inPileup && <div className="h-1 bg-alarm" />}

      <div className="px-4 sm:px-5 pt-4 pb-3">
        {/* header: subject + status */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={item.subject}
            onChange={(e) => onChange(item.id, { subject: e.target.value.slice(0, 16) })}
            className="font-mono text-[11px] font-bold px-2 py-1 rounded-md w-[9ch] uppercase focus:outline-none focus:ring-2 focus:ring-ink/15"
            style={{ background: s.pillBg, color: s.pillText }}
            aria-label="Subject code"
          />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border",
              clarify
                ? "bg-warn-tint border-warn-line text-warn"
                : "bg-ok-tint border-ok-line text-ok"
            )}
          >
            {clarify ? (
              <AlertTriangle className="size-3" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            {clarify
              ? item.datetime
                ? "Needs confirmation"
                : "Needs a date"
              : item.uiStatus === "confirmed"
                ? "You confirmed"
                : "Verified"}
          </span>
          {clarify && item.aiStatus !== "ok" && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-warn/80">
              {AI_LABEL[item.aiStatus]}
            </span>
          )}
          {inPileup && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-alarm-ink bg-alarm-tint border border-alarm-line rounded px-1.5 py-1">
              <Flag className="size-3" /> in pile-up
            </span>
          )}
          <button
            onClick={() => onRemove(item.id)}
            title="Remove from list"
            className="ml-auto size-7 grid place-items-center rounded-md text-ink-mute hover:text-alarm hover:bg-alarm-tint transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* editable title */}
        <div className="mt-3 group flex items-start gap-2">
          <PencilLine className="size-3.5 mt-1.5 text-ink-mute/60 group-focus-within:text-ink transition-colors shrink-0" />
          <input
            value={item.title}
            onChange={(e) => onChange(item.id, { title: e.target.value.slice(0, 120) })}
            className="w-full bg-transparent font-semibold text-[15px] leading-snug focus:outline-none border-b border-transparent focus:border-ink/30 placeholder:text-ink-mute"
            placeholder="Assignment title"
            aria-label="Assignment title"
          />
        </div>

        {/* date row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-ink-soft" />
            <input
              type="datetime-local"
              value={item.datetime ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange(
                  item.id,
                  v
                    ? { datetime: v, timeAssumed: false, uiStatus: "confirmed" }
                    : {
                        datetime: null,
                        timeAssumed: false,
                        uiStatus: "clarify",
                        clarification:
                          item.clarification ??
                          "Date removed - set it manually before this can join the cluster scan.",
                      }
                );
              }}
              className={cn(
                "font-mono text-[13px] tnum rounded-lg border px-2.5 py-1.5 bg-paper focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink/40",
                item.datetime ? "border-line" : "border-dashed border-warn-line text-ink-mute"
              )}
              aria-label="Deadline date and time"
            />
          </div>
          {item.datetime && (
            <span className="font-mono text-[12px] text-ink-soft tnum">
              {fmtShort(item.datetime)} · {item.timeAssumed ? "23:59*" : fmtTime(item.datetime)}
            </span>
          )}
          {item.datetime && (
            <span className="font-mono text-[11px] px-2 py-1 rounded-md bg-paper-deep border border-line text-ink-soft tnum">
              {relativeLabel(item.datetime)}
            </span>
          )}
        </div>
        {item.timeAssumed && item.datetime && (
          <p className="mt-1.5 text-[11px] font-mono text-ink-mute">
            * no time stated in the source — counted as 23:59 (end of day)
          </p>
        )}
      </div>

      {/* clarification box */}
      {clarify && (item.clarification || item.candidates.length > 0) && (
        <div className="mx-4 sm:mx-5 mb-4 rounded-xl border border-warn-line bg-warn-tint px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 mt-0.5 text-warn shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] leading-relaxed text-warn font-medium">
                {item.clarification}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {item.datetime && (
                  <button
                    onClick={() => onConfirmProposed(item.id)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-ink text-paper hover:bg-black transition-colors"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Confirm {fmtShort(item.datetime)}
                    {item.timeAssumed ? "" : ` ${fmtTime(item.datetime)}`}
                  </button>
                )}
                {item.candidates.map((c) => (
                  <button
                    key={`${c.date}-${c.time ?? ""}`}
                    onClick={() => onConfirmCandidate(item.id, c)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-warn-line bg-card hover:border-warn hover:bg-white transition-colors"
                  >
                    <CheckCircle2 className="size-3.5 text-ok" />
                    {c.label}
                  </button>
                ))}
                {!item.datetime && item.candidates.length === 0 && (
                  <span className="text-[12px] text-warn/80 font-mono">
                    Set the date manually in the field above.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* source text */}
      <div className="border-t border-line-soft">
        <button
          onClick={() => setShowSource((v) => !v)}
          className="w-full flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[12px] font-mono text-ink-mute hover:text-ink transition-colors"
        >
          <FileText className="size-3.5" />
          supporting source text
          {item.matchedText && (
            <span className="hidden sm:inline text-alarm/90 truncate max-w-[280px]">
              — “{item.matchedText}”
            </span>
          )}
          <ChevronDown
            className={cn("size-3.5 ml-auto transition-transform", showSource && "rotate-180")}
          />
        </button>
        {showSource && (
          <blockquote className="mx-4 sm:mx-5 mb-4 rounded-lg bg-paper border border-line px-3.5 py-3 font-mono text-[12px] leading-relaxed text-ink-soft whitespace-pre-wrap">
            {source.pre}
            {source.hit && (
              <mark className="bg-alarm-tint text-alarm-ink font-semibold rounded px-1 box-decoration-clone border-b-2 border-alarm">
                {source.hit}
              </mark>
            )}
            {source.post}
          </blockquote>
        )}
      </div>
    </article>
  );
}
