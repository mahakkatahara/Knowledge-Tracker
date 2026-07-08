// Knowledge Tracker logo — self-contained inline SVG mark + optional wordmark.
// No external asset needed (safe for a live deploy).

export function LogoMark({ size = 36, className = "" }) {
  return (
    <span
      className={`grid place-items-center rounded-xl ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#10b981,#0d9488)",
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* open book */}
        <path d="M3 5.2c2.7-1.1 5.3-1.1 8 0v13c-2.7-1.1-5.3-1.1-8 0v-13Z" fill="#ffffff" />
        <path d="M21 5.2c-2.7-1.1-5.3-1.1-8 0v13c2.7-1.1 5.3-1.1 8 0v-13Z" fill="#ffffff" opacity="0.85" />
        <path d="M12 5.2v13" stroke="#0d9488" strokeWidth="1.1" />
        {/* memory spark */}
        <circle cx="18.4" cy="4.2" r="2.4" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
      </svg>
    </span>
  );
}

export default function Logo({ size = 36, showText = true, tone = "ink", className = "" }) {
  const textColor = tone === "light" ? "#ffffff" : "var(--color-ink)";
  const subColor = tone === "light" ? "rgba(255,255,255,0.7)" : "var(--color-faint)";
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span className="leading-none">
          <span className="block font-display text-[15px] font-bold tracking-tight" style={{ color: textColor }}>
            Knowledge&nbsp;Tracker
          </span>
          <span className="mono block text-[9px] tracking-[0.26em]" style={{ color: subColor }}>
            BEAT&nbsp;THE&nbsp;CURVE
          </span>
        </span>
      )}
    </span>
  );
}
