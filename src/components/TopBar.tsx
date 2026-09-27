import { Flag, KeyRound, Sigma, Sparkles, TriangleAlert } from "lucide-react";

interface Props {
  hasKey: boolean;
  onOpenKey: () => void;
}

export default function TopBar({ hasKey, onOpenKey }: Props) {
  return (
    <header className="border-b border-line bg-card/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-alarm text-white grid place-items-center shadow-card">
            <Flag className="size-4.5" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-[17px] tracking-tight">
              Deadline Pile-Up
            </div>
            <div className="text-[11px] text-ink-mute font-mono tracking-wide">
              extract · verify · flag the crunch
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 ml-8">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-line bg-paper text-ink-soft">
            <Sparkles className="size-3 text-alarm" /> AI: extraction only
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-line bg-paper text-ink-soft">
            <Sigma className="size-3 text-ok" /> Code: sort + 48h clusters
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {!hasKey && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-warn">
              <TriangleAlert className="size-3.5" /> no API key
            </span>
          )}
          <button
            onClick={onOpenKey}
            className="inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-lg border border-line bg-card hover:border-ink/30 hover:shadow-card transition-all"
          >
            <KeyRound className="size-4" />
            <span className="hidden sm:inline">{hasKey ? "API settings" : "Add API key"}</span>
            <span className={`size-1.5 rounded-full ${hasKey ? "bg-ok" : "bg-warn animate-pulse"}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
