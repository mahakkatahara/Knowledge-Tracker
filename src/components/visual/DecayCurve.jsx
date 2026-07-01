import { useId } from "react";
import { motion } from "framer-motion";

/**
 * DecayCurve — the product's signature motif.
 * Draws the Ebbinghaus forgetting curve: memory starts at 100% and decays.
 * A glowing node marks the current `retention`, sitting on the curve in its
 * own risk colour. The path self-draws on mount.
 */
export default function DecayCurve({
  retention = 62,
  width = 520,
  height = 220,
  className,
  showNode = true,
}) {
  const id = useId().replace(/:/g, "");
  const pad = 18;
  const w = width - pad * 2;
  const h = height - pad * 2;

  // Ebbinghaus-ish: R = e^(-t/S). Sample across t.
  const S = 1.15;
  const pts = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * 3.2;
    const r = Math.exp(-t / S);
    pts.push([pad + (i / N) * w, pad + (1 - r) * h]);
  }
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pad + w} ${pad + h} L${pad} ${pad + h} Z`;

  // node position from retention %
  const rv = Math.min(100, Math.max(0, retention)) / 100;
  const tNode = -S * Math.log(Math.max(0.04, rv));
  const nx = pad + Math.min(1, tNode / 3.2) * w;
  const ny = pad + (1 - rv) * h;
  const nodeColor = retention >= 70 ? "#2fe0c0" : retention >= 40 ? "#f6b545" : "#ff527a";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a99bff" />
          <stop offset="55%" stopColor="#38d6ff" />
          <stop offset="100%" stopColor={nodeColor} />
        </linearGradient>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c6cff" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#7c6cff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* baseline grid ticks */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={pad + w}
          y1={pad + g * h}
          y2={pad + g * h}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}

      <motion.path
        d={area}
        fill={`url(#area-${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      />
      <motion.path
        d={d}
        stroke={`url(#stroke-${id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ filter: "drop-shadow(0 0 6px rgba(56,214,255,0.45))" }}
      />

      {showNode && (
        <motion.g
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: "spring", stiffness: 200, damping: 14 }}
          style={{ transformOrigin: `${nx}px ${ny}px` }}
        >
          <circle cx={nx} cy={ny} r="11" fill={nodeColor} opacity="0.18" className="animate-pulse-glow" />
          <circle cx={nx} cy={ny} r="4.5" fill={nodeColor} style={{ filter: `drop-shadow(0 0 8px ${nodeColor})` }} />
        </motion.g>
      )}
    </svg>
  );
}
