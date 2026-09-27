import {
  Candidate,
  DeadlineItem,
  RawStatus,
  cellKey,
  makeId,
  toLocalISO,
} from "./deadlines";

// ─────────────────────────────────────────────────────────────────────────────
// THE ONLY AI TOUCHPOINT. The model extracts structure from prose and must
// flag uncertainty instead of guessing. Everything downstream (sort, cluster)
// is deterministic code.
// ─────────────────────────────────────────────────────────────────────────────

export interface LlmConfig {
  apiKey: string;
  baseUrl: string; // e.g. https://api.openai.com/v1
  model: string; // e.g. gpt-4o-mini
}

export const DEFAULT_CONFIG: LlmConfig = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
};

interface RawCandidate {
  date?: string;
  time?: string | null;
  label?: string;
}

interface RawItem {
  index?: number;
  title?: string;
  subject?: string;
  status?: string;
  proposed_date?: string | null;
  proposed_time?: string | null;
  matched_text?: string | null;
  clarification?: string | null;
  candidates?: RawCandidate[];
}

const SYSTEM_PROMPT = `You are a deadline extractor for a student tool. You receive up to 6 short assignment announcements, separated into numbered blocks.

For EACH block output one JSON object with:
- "index": the block number (0-based)
- "title": short assignment name (max 8 words, from the text, no invention)
- "subject": course/subject code if present (e.g. "CS201"), else the best short subject label from the text, else "GENERAL"
- "status": exactly one of "ok", "missing_year", "relative_date", "ambiguous_format", "conflicting", "none_found"
- "proposed_date": "YYYY-MM-DD" or null
- "proposed_time": "HH:MM" 24h or null
- "matched_text": the EXACT sentence/phrase from the block that states the deadline (verbatim substring)
- "clarification": null if status is "ok", otherwise a ONE-sentence question to the user naming exactly what is unclear
- "candidates": for ambiguous dates, an array of {"date": "YYYY-MM-DD", "time": "HH:MM" or null, "label": "short human label"}; otherwise []

STRICT RULES — never guess silently:
1. If a date has no year, propose the nearest PLAUSIBLE future occurrence relative to the reference date as proposed_date, but set status "missing_year".
2. Relative phrases ("next Friday", "in two weeks", "end of the week") must compute against the reference date AND set status "relative_date". If a relative phrase is genuinely ambiguous (e.g. "next Friday" early in a week can mean two different Fridays), leave proposed_date null and return BOTH readings as candidates.
3. Numeric dates like 12/03 with unclear day/month order: status "ambiguous_format", proposed_date null, both readings as candidates.
4. Contradicting dates in one block: status "conflicting", proposed_date null, each reading as a candidate.
5. If a time-of-day is not stated, proposed_time must be null. A candidate missing a time uses time null.
6. Never invent a deadline that is not in the text. No deadline at all → status "none_found", proposed_date null, proposed_time null, matched_text null.

Return JSON ONLY: {"items": [ ... ]}, one object per block, in the same order.`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const VALID: RawStatus[] = [
  "ok",
  "missing_year",
  "relative_date",
  "ambiguous_format",
  "conflicting",
  "none_found",
];

function coerceCandidates(raw: RawCandidate[] | undefined): Candidate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c.date === "string" && DATE_RE.test(c.date))
    .map((c) => ({
      date: c.date!,
      time: c.time && TIME_RE.test(c.time) ? c.time : null,
      label: typeof c.label === "string" && c.label.trim() ? c.label.trim() : c.date!,
    }))
    .slice(0, 3);
}

export async function extractWithLLM(
  blocks: string[],
  cfg: LlmConfig,
  signal?: AbortSignal
): Promise<DeadlineItem[]> {
  const now = new Date();
  const ref = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  const userContent =
    `Reference date: ${ref} (a ${weekday}). Use it ONLY for relative-date arithmetic per the rules.\n\n` +
    blocks.map((b, i) => `--- BLOCK ${i} ---\n${b}`).join("\n\n");

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      res.status === 401
        ? "API key rejected (401). Check the key in Settings."
        : `Extraction request failed (${res.status}). ${body.slice(0, 160)}`
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model returned an empty response.");

  let parsed: { items?: RawItem[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The model returned invalid JSON.");
  }
  if (!Array.isArray(parsed.items)) throw new Error("The model response had no items array.");

  // Code-side normalisation: honesty checks, no trust handed to the model.
  return blocks.slice(0, 6).map((block, i) => {
    const raw: RawItem | undefined =
      parsed.items!.find((it) => it?.index === i) ?? parsed.items![i];
    if (!raw) {
      return emptyItem(block, i, "The model returned nothing for this block. Set the deadline manually.");
    }

    const status: RawStatus = VALID.includes(raw.status as RawStatus)
      ? (raw.status as RawStatus)
      : "none_found";

    // matched_text must be a real substring of the block, else drop it
    let matched: string | null = null;
    if (typeof raw.matched_text === "string" && raw.matched_text.trim()) {
      const idx = block.toLowerCase().indexOf(raw.matched_text.trim().toLowerCase());
      if (idx >= 0) matched = block.slice(idx, idx + raw.matched_text.trim().length);
    }

    let datetime: string | null = null;
    let timeAssumed = false;
    if (status !== "none_found" && raw.proposed_date && DATE_RE.test(raw.proposed_date)) {
      const time = raw.proposed_time && TIME_RE.test(raw.proposed_time) ? raw.proposed_time : null;
      const built = toLocalISO(raw.proposed_date, time);
      datetime = built.datetime;
      timeAssumed = built.timeAssumed;
    }

    return {
      id: makeId("llm"),
      sourceIndex: i,
      title: (raw.title ?? "").trim().slice(0, 90) || `Announcement ${i + 1}`,
      subject: (raw.subject ?? "").trim().slice(0, 24) || "GENERAL",
      datetime,
      timeAssumed,
      originalText: block,
      matchedText: matched,
      aiStatus: status,
      uiStatus: status === "ok" && datetime ? "verified" : "clarify",
      clarification:
        status === "ok"
          ? null
          : (raw.clarification ?? "").trim().slice(0, 240) ||
            defaultQuestion(status),
      candidates: coerceCandidates(raw.candidates),
    } satisfies DeadlineItem;
  });
}

function defaultQuestion(status: RawStatus): string {
  switch (status) {
    case "missing_year":
      return "The date has no year - confirm it before trusting this deadline.";
    case "relative_date":
      return "The deadline was relative (" + "\u201Cnext week\u201D-style). Confirm the exact date.";
    case "ambiguous_format":
      return "This date is ambiguous. Pick the correct reading.";
    case "conflicting":
      return "The announcement contradicts itself. Pick the correct date.";
    default:
      return "No deadline found in this block. Set one manually.";
  }
}

function emptyItem(block: string, i: number, note: string): DeadlineItem {
  return {
    id: makeId("mt"),
    sourceIndex: i,
    title: block.split("\n")[0].slice(0, 80) || `Announcement ${i + 1}`,
    subject: "GENERAL",
    datetime: null,
    timeAssumed: false,
    originalText: block,
    matchedText: null,
    aiStatus: "none_found",
    uiStatus: "clarify",
    clarification: note,
    candidates: [],
  };
}

/** Small helper used by the UI to group identical subjects loosely. */
export function sameSubject(a: string, b: string): boolean {
  return cellKey(a) === cellKey(b);
}
