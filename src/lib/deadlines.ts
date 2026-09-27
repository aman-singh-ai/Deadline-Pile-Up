// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC CORE — no AI anywhere in this file.
// Sorting, cluster detection (>= 3 submissions inside any 48-hour window),
// date formatting and colour hashing are plain, testable code.
// ─────────────────────────────────────────────────────────────────────────────

export type RawStatus =
  | "ok"
  | "missing_year"
  | "relative_date"
  | "ambiguous_format"
  | "conflicting"
  | "none_found";

export type UiStatus = "verified" | "clarify" | "confirmed";

export interface Candidate {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  label: string;
}

export interface DeadlineItem {
  id: string;
  sourceIndex: number;
  title: string;
  subject: string;
  /** local ISO "YYYY-MM-DDTHH:MM" or null when no date could be responsibly set */
  datetime: string | null;
  /** true when the source gave a date but no time → counted as 23:59, disclosed in UI */
  timeAssumed: boolean;
  originalText: string;
  matchedText: string | null;
  aiStatus: RawStatus;
  uiStatus: UiStatus;
  clarification: string | null;
  candidates: Candidate[];
}

export interface Pileup {
  id: string;
  itemIds: string[];
  windowStartMs: number;
  windowEndMs: number;
  tentativeIds: string[];
}

export interface ViewModel {
  dated: DeadlineItem[];
  undated: DeadlineItem[];
  pileups: Pileup[];
  pileupOf: Map<string, string>;
  stats: {
    total: number;
    verified: number;
    clarify: number;
    undated: number;
    pileupCount: number;
  };
}

export const WINDOW_HOURS = 48;
export const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
export const CLUSTER_THRESHOLD = 3;

let counter = 0;
export function makeId(seed = ""): string {
  counter += 1;
  return `d${Date.now().toString(36)}${counter.toString(36)}${seed}`;
}

/** Split pasted text into announcement blocks on blank lines. */
export function splitBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
}

/** Combine an AI/date candidate into a stored local datetime. */
export function toLocalISO(date: string, time: string | null): { datetime: string; timeAssumed: boolean } {
  const timeAssumed = !time;
  return { datetime: `${date}T${time ?? "23:59"}`, timeAssumed };
}

export function parseLocal(iso: string): Date {
  return new Date(iso);
}

// ── Pile-up detection (pure) ─────────────────────────────────────────────────

export function findPileups(items: DeadlineItem[]): Pileup[] {
  const dated = items
    .filter((i) => i.datetime)
    .map((i) => ({ item: i, t: parseLocal(i.datetime!).getTime() }))
    .sort((a, b) => a.t - b.t);

  // sliding window: for every start i, find the furthest j still within 48h
  const windows: [number, number][] = [];
  let j = 0;
  for (let i = 0; i < dated.length; i++) {
    if (j < i) j = i;
    while (j + 1 < dated.length && dated[j + 1].t - dated[i].t <= WINDOW_MS) j += 1;
    if (j - i + 1 >= CLUSTER_THRESHOLD) windows.push([i, j]);
  }

  // merge overlapping windows into pile-up groups
  const merged: [number, number][] = [];
  for (const [s, e] of windows) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  return merged.map(([s, e], idx) => {
    const members = dated.slice(s, e + 1).map((d) => d.item);
    const tentative = members.filter((m) => m.uiStatus === "clarify").map((m) => m.id);
    return {
      id: `pileup-${idx + 1}`,
      itemIds: members.map((m) => m.id),
      windowStartMs: dated[s].t,
      windowEndMs: dated[s].t + WINDOW_MS,
      tentativeIds: tentative,
    };
  });
}

export function computeView(items: DeadlineItem[]): ViewModel {
  const dated = items
    .filter((i) => i.datetime)
    .sort((a, b) => parseLocal(a.datetime!).getTime() - parseLocal(b.datetime!).getTime());
  const undated = items.filter((i) => !i.datetime);
  const pileups = findPileups(items);
  const pileupOf = new Map<string, string>();
  for (const p of pileups) for (const id of p.itemIds) pileupOf.set(id, p.id);

  return {
    dated,
    undated,
    pileups,
    pileupOf,
    stats: {
      total: items.length,
      verified: items.filter((i) => i.uiStatus !== "clarify").length,
      clarify: items.filter((i) => i.uiStatus === "clarify").length,
      undated: undated.length,
      pileupCount: pileups.length,
    },
  };
}

// ── Formatting helpers (plain date math) ─────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(msOrIso: number | string): string {
  const d = typeof msOrIso === "number" ? new Date(msOrIso) : parseLocal(msOrIso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtShort(msOrIso: number | string): string {
  const d = typeof msOrIso === "number" ? new Date(msOrIso) : parseLocal(msOrIso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtTime(msOrIso: number | string): string {
  const d = typeof msOrIso === "number" ? new Date(msOrIso) : parseLocal(msOrIso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function relativeLabel(iso: string): string {
  const t = parseLocal(iso).getTime();
  const days = Math.floor((t - Date.now()) / 86_400_000);
  if (days < -1) return `${-days} days ago`;
  if (days === -1) return "yesterday";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 30) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  return `in ${weeks} wk`;
}

/** Deterministic pastel identity per subject code. */
export function subjectStyle(subject: string): { dot: string; pillBg: string; pillText: string } {
  let h = 0;
  const s = subject || "?";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    dot: `hsl(${hue} 68% 42%)`,
    pillBg: `hsl(${hue} 60% 93%)`,
    pillText: `hsl(${hue} 45% 26%)`,
  };
}

export function cellKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
