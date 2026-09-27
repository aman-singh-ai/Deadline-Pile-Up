import { AlarmClock, Flag, MoveRight, TriangleAlert } from "lucide-react";
import {
  DeadlineItem,
  Pileup,
  fmtShort,
  fmtTime,
  subjectStyle,
} from "../lib/deadlines";

interface Props {
  pileups: Pileup[];
  byId: Map<string, DeadlineItem>;
}

export default function PileupBanner({ pileups, byId }: Props) {
  if (pileups.length === 0) return null;

  return (
    <div className="space-y-4">
      {pileups.map((p, n) => {
        const members = p.itemIds
          .map((id) => byId.get(id))
          .filter(Boolean) as DeadlineItem[];
        const tentative = p.tentativeIds.length;

        return (
          <section
            key={p.id}
            className="rise rounded-2xl border-2 border-alarm-line bg-alarm-tint shadow-card overflow-hidden"
            style={{ animationDelay: `${n * 90}ms` }}
          >
            <div className="hazard-band h-1.5 w-full" />
            <div className="px-5 sm:px-7 py-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="size-12 rounded-xl bg-alarm text-white grid place-items-center shadow-card animate-pulse-soft">
                  <Flag className="size-5.5" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-alarm uppercase">
                    Pile-up detected
                  </div>
                  <div className="font-display font-semibold text-2xl sm:text-[1.7rem] leading-tight text-alarm-ink">
                    {p.itemIds.length} submissions inside one 48-hour window
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2 font-mono text-[12px] sm:text-[13px] font-semibold text-alarm-ink bg-card/70 border border-alarm-line rounded-lg px-3 py-2 tnum">
                  <AlarmClock className="size-4" />
                  {fmtShort(p.windowStartMs)} {fmtTime(p.windowStartMs)}
                  <MoveRight className="size-4" />
                  {fmtShort(p.windowEndMs)} {fmtTime(p.windowEndMs)}
                </div>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {members.map((m) => {
                  const s = subjectStyle(m.subject);
                  const isTentative = m.uiStatus === "clarify";
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 bg-card/85 border border-alarm-line/70 rounded-xl px-3.5 py-3"
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ background: s.dot, outline: isTentative ? "2px dashed hsl(28 80% 45%)" : "none", outlineOffset: 2 }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: s.pillBg, color: s.pillText }}
                          >
                            {m.subject}
                          </span>
                          <span className="font-mono text-[11px] text-ink-soft tnum">
                            {fmtShort(m.datetime!)} · {m.timeAssumed ? "23:59*" : fmtTime(m.datetime!)}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium truncate mt-1">{m.title}</div>
                      </div>
                      {isTentative && (
                        <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wide text-warn bg-warn-tint border border-warn-line rounded px-1.5 py-1">
                          <TriangleAlert className="size-3" />
                          unconfirmed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {tentative > 0 && (
                <p className="mt-4 text-[12.5px] font-mono text-alarm-ink/80 flex items-center gap-2">
                  <TriangleAlert className="size-3.5" />
                  {tentative} of these dates is/are still unconfirmed — the flag stands, but
                  verify them below. *time unknown → counted as end of day.
                </p>
              )}
              {tentative === 0 && (
                <p className="mt-4 text-[12.5px] font-mono text-alarm-ink/80">
                  Deterministic rule: any 48-hour window holding 3+ dated submissions is flagged.
                  Nothing here re-plans your work — it just shows the crunch.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
