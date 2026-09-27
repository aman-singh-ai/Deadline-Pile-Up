import { CalendarRange, Info } from "lucide-react";
import {
  DeadlineItem,
  Pileup,
  fmtShort,
  fmtTime,
  parseLocal,
  subjectStyle,
} from "../lib/deadlines";

interface Props {
  dated: DeadlineItem[];
  pileups: Pileup[];
}

const W = 1000;
const H = 196;
const DAY_W_LABEL_Y = 20;

export default function Timeline({ dated, pileups }: Props) {
  if (dated.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card/60 px-6 py-8 text-center">
        <CalendarRange className="size-5 mx-auto text-ink-mute" />
        <p className="mt-2 text-[13px] text-ink-mute font-mono">
          No dated deadlines yet — clarify the flagged cards and the timeline draws itself.
        </p>
      </div>
    );
  }

  const times = dated.map((d) => parseLocal(d.datetime!).getTime());
  let rangeStart = Math.min(...times, ...pileups.map((p) => p.windowStartMs));
  let rangeEnd = Math.max(...times, ...pileups.map((p) => p.windowEndMs));

  // pad to surrounding day boundaries ± half day
  const s = new Date(rangeStart);
  s.setHours(0, 0, 0, 0);
  rangeStart = s.getTime() - 12 * 3600_000;
  const e = new Date(rangeEnd);
  e.setHours(0, 0, 0, 0);
  rangeEnd = e.getTime() + 36 * 3600_000;

  const span = rangeEnd - rangeStart;
  const xOf = (t: number) => 38 + ((t - rangeStart) / span) * (W - 76);

  // day gridlines
  const days: number[] = [];
  for (let t = new Date(rangeStart).setHours(0, 0, 0, 0) + 86_400_000; t < rangeEnd; t += 86_400_000) {
    days.push(t);
  }

  const now = Date.now();
  const nowInRange = now >= rangeStart && now <= rangeEnd;

  return (
    <div className="rounded-2xl border border-line bg-card shadow-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3 border-b border-line-soft">
        <h3 className="font-semibold text-[14px] flex items-center gap-2">
          <CalendarRange className="size-4 text-ink-soft" /> Timeline
        </h3>
        <span className="font-mono text-[11px] text-ink-mute">
          {fmtShort(rangeStart)} → {fmtShort(rangeEnd)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10.5px] text-ink-mute">
          <span className="size-2 rounded-full bg-alarm inline-block" /> shaded band = 48h pile-up
          window
          <span className="inline-block size-2 rounded-full border-2 border-dashed border-warn ml-3" />
          unconfirmed date
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label="Deadline timeline">
        {/* alternating day shading */}
        {days.map((t, i) =>
          i % 2 === 0 ? (
            <rect
              key={`shade-${t}`}
              x={xOf(t)}
              y={30}
              width={Math.max(0, xOf(t + 86_400_000) - xOf(t))}
              height={128}
              fill="rgb(27 24 21 / 0.025)"
            />
          ) : null
        )}

        {/* pile-up bands */}
        {pileups.map((p) => {
          const x1 = xOf(p.windowStartMs);
          const x2 = xOf(p.windowEndMs);
          return (
            <g key={p.id}>
              <rect x={x1} y={30} width={x2 - x1} height={128} fill="hsl(18 82% 50% / 0.13)" />
              <line x1={x1} y1={30} x2={x1} y2={158} stroke="hsl(18 82% 42%)" strokeWidth={1.5} strokeDasharray="5 4" />
              <line x1={x2} y1={30} x2={x2} y2={158} stroke="hsl(18 82% 42%)" strokeWidth={1.5} strokeDasharray="5 4" />
              <text
                x={(x1 + x2) / 2}
                y={46}
                textAnchor="middle"
                className="fill-alarm"
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
              >
                48H PILE-UP
              </text>
            </g>
          );
        })}

        {/* day gridlines + labels */}
        {days.map((t) => {
          const d = new Date(t);
          const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
          return (
            <g key={`day-${t}`}>
              <line x1={xOf(t)} y1={30} x2={xOf(t)} y2={158} stroke="#e3ded2" strokeWidth={1} />
              <text
                x={xOf(t) + 4}
                y={DAY_W_LABEL_Y}
                fontSize={11}
                fill="#8a837a"
                fontFamily="JetBrains Mono, monospace"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* now marker */}
        {nowInRange && (
          <g>
            <line x1={xOf(now)} y1={28} x2={xOf(now)} y2={158} stroke="#15803d" strokeWidth={1.5} strokeDasharray="2 3" />
            <text x={xOf(now) + 4} y={168} fontSize={10} fill="#15803d" fontFamily="JetBrains Mono, monospace" fontWeight={700}>
              NOW
            </text>
          </g>
        )}

        {/* deadline dots, alternating lanes */}
        {dated.map((item, i) => {
          const t = parseLocal(item.datetime!).getTime();
          const lane = i % 2;
          const y = lane === 0 ? 76 : 122;
          const s = subjectStyle(item.subject);
          const tentative = item.uiStatus === "clarify";
          return (
            <g key={item.id}>
              <title>{`${item.subject} · ${item.title}\n${fmtShort(t)} ${fmtTime(t)}${tentative ? " (unconfirmed)" : ""}`}</title>
              <line x1={xOf(t)} y1={y - 16} x2={xOf(t)} y2={y - 8} stroke={s.dot} strokeWidth={1} opacity={0.6} />
              <circle
                cx={xOf(t)}
                cy={y}
                r={7}
                fill={s.dot}
                stroke={tentative ? "#b45309" : "#fffdf9"}
                strokeWidth={tentative ? 2 : 2.5}
                strokeDasharray={tentative ? "3 2" : undefined}
              />
              <text
                x={xOf(t)}
                y={y + (lane === 0 ? 22 : 24)}
                textAnchor="middle"
                fontSize={10.5}
                fontFamily="JetBrains Mono, monospace"
                fill={tentative ? "#b45309" : "#57514a"}
                fontWeight={600}
              >
                {`${String(new Date(t).getDate()).padStart(2, "0")}·${fmtTime(t)}`}
              </text>
              <text
                x={xOf(t)}
                y={y + (lane === 0 ? 35 : 37)}
                textAnchor="middle"
                fontSize={9.5}
                fontFamily="JetBrains Mono, monospace"
                fill="#8a837a"
              >
                {item.subject}
              </text>
            </g>
          );
        })}

        {/* baseline */}
        <line x1={30} y1={158} x2={W - 30} y2={158} stroke="#cfc8b8" strokeWidth={1.5} />
      </svg>

      {(dated.some((d) => d.timeAssumed) || pileups.length > 0) && (
        <div className="px-5 py-2.5 border-t border-line-soft flex items-center gap-2 text-[11px] font-mono text-ink-mute">
          <Info className="size-3.5 shrink-0" />
          Items without a stated time are counted as 23:59 (end of day) and marked on their card.
        </div>
      )}
    </div>
  );
}
