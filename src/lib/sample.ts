import { DeadlineItem, makeId, toLocalISO } from "./deadlines";

// ─────────────────────────────────────────────────────────────────────────────
// Six deliberately messy sample announcements (blank-line separated).
// They contain: an explicit full date, two dates with NO year, one relative
// "next Friday", one ambiguous "12/03", and one internally conflicting notice.
// ─────────────────────────────────────────────────────────────────────────────

export const SAMPLE_TEXT = `CS201 - Data Structures & Algorithms
Assignment 4: Graph Traversal Report is live on Moodle. Submit ONE pdf, due Fri 13 March, 5:00 pm. Late submissions lose 10% per day.

CHEM 150 - General Chemistry I
Lab Report 3 (spectroscopy worksheet + calculation appendix) closes in the portal on 14 March 2026 at 11:59 PM. The portal locks automatically - no exceptions.

MATH 204 tutorial note (posted Monday 9 March): Problem Set 7 is due next Friday at the start of the lecture. Bring a printed copy, handwritten is fine.

From: Dr. Okafor - HIST 110
Quick one: the Industrial Revolution short essay is due 12/03. Hand it in before the Wednesday lecture please.

ENG-210 Engineering Graphics
Team reminder: the final bridge model files must be in the shared drive by Sunday 15 March, 4:00 pm at the latest. Check the file naming convention before you upload.

PSY 230 announcement: the personality quiz has been pushed back. It is now due Monday 16 March - careful though, Monday is actually the 15th, but the quiz tool says the 16th. Online only.`;

// ─────────────────────────────────────────────────────────────────────────────
// DEMO FIXTURES — used ONLY in offline demo mode (no API key). Clearly labelled
// in the UI as simulated. With a key, the real LLM produces the same shape.
// ─────────────────────────────────────────────────────────────────────────────

interface Fixture {
  match: RegExp;
  build: (block: string, index: number) => DeadlineItem;
}

const FIXTURES: Fixture[] = [
  {
    match: /CS?201|graph traversal/i,
    build: (block, i) => {
      const { datetime, timeAssumed } = toLocalISO("2026-03-13", "17:00");
      return {
        id: makeId("cs"),
        sourceIndex: i,
        title: "Assignment 4: Graph Traversal Report",
        subject: "CS201",
        datetime,
        timeAssumed,
        originalText: block,
        matchedText: "due Fri 13 March, 5:00 pm",
        aiStatus: "missing_year",
        uiStatus: "clarify",
        clarification:
          "\u201CFri 13 March\u201D has no year - proposed as 2026, but not silently trusted. Confirm it (or correct the date) to verify this deadline.",
        candidates: [],
      };
    },
  },
  {
    match: /CHEM|spectroscopy/i,
    build: (block, i) => {
      const { datetime, timeAssumed } = toLocalISO("2026-03-14", "23:59");
      return {
        id: makeId("ch"),
        sourceIndex: i,
        title: "Lab Report 3: Spectroscopy",
        subject: "CHEM150",
        datetime,
        timeAssumed,
        originalText: block,
        matchedText: "closes in the portal on 14 March 2026 at 11:59 PM",
        aiStatus: "ok",
        uiStatus: "verified",
        clarification: null,
        candidates: [],
      };
    },
  },
  {
    match: /MATH|problem set/i,
    build: (block, i) => ({
      id: makeId("ma"),
      sourceIndex: i,
      title: "Problem Set 7",
      subject: "MATH204",
      datetime: null,
      timeAssumed: false,
      originalText: block,
      matchedText: "due next Friday at the start of the lecture",
      aiStatus: "relative_date",
      uiStatus: "clarify",
      clarification:
        "Posted Monday 9 March, \u201Cnext Friday\u201D is ambiguous - it could mean the coming Friday or the one after. Pick one.",
      candidates: [
        { date: "2026-03-13", time: null, label: "Fri 13 Mar - coming Friday" },
        { date: "2026-03-20", time: null, label: "Fri 20 Mar - a week later" },
      ],
    }),
  },
  {
    match: /HIST|industrial revolution/i,
    build: (block, i) => ({
      id: makeId("hi"),
      sourceIndex: i,
      title: "Industrial Revolution Short Essay",
      subject: "HIST110",
      datetime: null,
      timeAssumed: false,
      originalText: block,
      matchedText: "the Industrial Revolution short essay is due 12/03",
      aiStatus: "ambiguous_format",
      uiStatus: "clarify",
      clarification:
        "\u201C12/03\u201D has no year and the day/month order is unclear. Which date is real?",
      candidates: [
        { date: "2026-03-12", time: null, label: "12 Mar 2026 (DD/MM)" },
        { date: "2026-12-03", time: null, label: "3 Dec 2026 (MM/DD)" },
      ],
    }),
  },
  {
    match: /ENG-?210|bridge model/i,
    build: (block, i) => {
      const { datetime, timeAssumed } = toLocalISO("2026-03-15", "16:00");
      return {
        id: makeId("en"),
        sourceIndex: i,
        title: "Final Bridge Model Upload",
        subject: "ENG-210",
        datetime,
        timeAssumed,
        originalText: block,
        matchedText: "must be in the shared drive by Sunday 15 March, 4:00 pm",
        aiStatus: "missing_year",
        uiStatus: "clarify",
        clarification:
          "\u201CSunday 15 March\u201D has no year - proposed as 2026, but not silently trusted. Confirm it (or correct the date) to verify this deadline.",
        candidates: [],
      };
    },
  },
  {
    match: /PSY|personality quiz/i,
    build: (block, i) => ({
      id: makeId("ps"),
      sourceIndex: i,
      title: "Personality Quiz",
      subject: "PSY230",
      datetime: null,
      timeAssumed: false,
      originalText: block,
      matchedText: "now due Monday 16 March - careful though, Monday is actually the 15th",
      aiStatus: "conflicting",
      uiStatus: "clarify",
      clarification:
        "The notice says \u201CMonday 16 March\u201D but also claims Monday is the 15th - the two dates contradict each other.",
      candidates: [
        { date: "2026-03-15", time: null, label: "Sun 15 Mar 2026" },
        { date: "2026-03-16", time: null, label: "Mon 16 Mar 2026 (weekday matches)" },
      ],
    }),
  },
];

/** Offline fallback: deterministic dispatch per block; unknown blocks are never
 *  invented - they surface as "no deadline found" so the user stays in control. */
export function demoExtract(blocks: string[]): DeadlineItem[] {
  return blocks.slice(0, 6).map((block, i) => {
    const fx = FIXTURES.find((f) => f.match.test(block));
    if (fx) return fx.build(block, i);
    return {
      id: makeId("nf"),
      sourceIndex: i,
      title: block.split("\n")[0].slice(0, 80) || `Announcement ${i + 1}`,
      subject: "UNKNOWN",
      datetime: null,
      timeAssumed: false,
      originalText: block,
      matchedText: null,
      aiStatus: "none_found",
      uiStatus: "clarify",
      clarification: "Demo mode could not find a deadline in this block. Set one manually.",
      candidates: [],
    };
  });
}
