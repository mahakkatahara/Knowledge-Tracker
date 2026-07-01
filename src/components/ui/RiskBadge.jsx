import { riskOf } from "../../lib/risk";
import { cn } from "../../lib/cn";

/** A small pill that states a topic's forget-risk in its semantic colour. */
export default function RiskBadge({ risk = "Medium", className, withDot = true }) {
  const r = riskOf(risk);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide mono",
        className
      )}
      style={{ background: r.soft, color: r.color, border: `1px solid ${r.border}` }}
    >
      {withDot && (
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse-glow"
          style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }}
        />
      )}
      {r.label} Risk
    </span>
  );
}
