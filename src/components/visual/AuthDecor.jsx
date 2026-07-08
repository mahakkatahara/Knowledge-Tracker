// Static ambient background for the auth brand panel — a soft dot texture,
// gentle accent washes and a large faint book watermark. Fills the emerald
// space so the panel reads rich, not bare. No motion, no pink.

export default function AuthDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* dot texture across the whole panel */}
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.9) 1.1px, transparent 1.1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* soft accent washes (emerald / teal / amber — no pink) */}
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-teal-600/40 blur-3xl" />
      <div className="absolute right-8 top-16 h-16 w-16 rounded-full bg-yellow-300/80" />
      <div className="absolute -bottom-16 -right-12 h-56 w-56 rounded-full bg-emerald-700/30 blur-3xl" />

      {/* large faint book watermark, bottom-left */}
      <svg className="absolute -bottom-10 -left-12 h-80 w-80 opacity-[0.10]" viewBox="0 0 240 200" fill="none">
        <path d="M20 30c30-14 60-14 100 0v150c-40-14-70-14-100 0V30Z" fill="#ffffff" />
        <path d="M220 30c-30-14-60-14-100 0v150c40-14 70-14 100 0V30Z" fill="#ffffff" opacity="0.85" />
        <path d="M120 30v150" stroke="#064e3b" strokeWidth="4" />
        <path d="M40 60c22-8 42-8 64 0M40 92c22-8 42-8 64 0M40 124c22-8 42-8 64 0" stroke="#064e3b" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <path d="M136 60c22-8 42-8 64 0M136 92c22-8 42-8 64 0M136 124c22-8 42-8 64 0" stroke="#064e3b" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      </svg>
    </div>
  );
}
