import type { Latest } from "@/lib/types";

export function Caveat({ latest }: { latest: Latest }) {
  return (
    <footer className="mt-2 flex items-start gap-3 rounded-xl border border-edge bg-surface-2 p-4">
      <span className="mt-0.5 shrink-0 rounded-md border border-accent-rose/40 bg-accent-rose/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-accent-rose">
        Caveat
      </span>
      <p className="text-[12px] leading-relaxed text-ink-3">{latest.caveat}</p>
    </footer>
  );
}
