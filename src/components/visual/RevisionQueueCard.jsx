// A solid, static "revision queue" card for the auth panel.
// Shows the product's core idea — topics sorted by forget-risk — as one
// clean card that sits in the normal layout flow (no floating, no motion),
// so it fills the middle of the panel without overlapping anything.

const ROWS = [
  { topic: "Binary Search", tier: "Low", dot: "#10b981", pct: "34%" },
  { topic: "Graph Algos", tier: "Medium", dot: "#f59e0b", pct: "66%" },
  { topic: "Dynamic Prog.", tier: "High", dot: "#ef4444", pct: "92%" },
];

export default function RevisionQueueCard({ className = "" }) {
  return (
    <div
      className={`w-full max-w-sm rounded-3xl bg-white/95 p-5 shadow-[0_24px_60px_-24px_rgba(2,44,34,0.55)] ring-1 ring-black/5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800">Today&apos;s revision queue</span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          3 topics
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {ROWS.map((r) => (
          <div key={r.topic} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.dot }} />
            <span className="w-24 shrink-0 text-[13px] font-medium text-slate-700">{r.topic}</span>
            <span className="flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-1.5 rounded-full" style={{ width: r.pct, background: r.dot }} />
            </span>
            <span
              className="mono w-14 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: r.dot }}
            >
              {r.tier}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
