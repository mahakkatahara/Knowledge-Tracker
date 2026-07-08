// Flat cartoon mascot — a student hugging a stack of books.
// Pure inline SVG so it ships without any image asset. Used on auth
// panels and empty states to add warmth without an AI-photo look.

export default function StudyMascot({ className = "" }) {
  return (
    <svg
      viewBox="0 0 260 300"
      className={className}
      role="img"
      aria-label="Student holding a stack of books"
    >
      {/* ground shadow */}
      <ellipse cx="130" cy="278" rx="86" ry="16" fill="#0f172a" opacity="0.14" />

      {/* back leg + front leg */}
      <rect x="104" y="214" width="22" height="56" rx="11" fill="#0b3b32" />
      <rect x="134" y="214" width="22" height="56" rx="11" fill="#0f4a3e" />
      {/* shoes */}
      <rect x="98" y="262" width="34" height="16" rx="8" fill="#facc15" />
      <rect x="132" y="262" width="34" height="16" rx="8" fill="#2dd4bf" />

      {/* torso / hoodie */}
      <path d="M92 150 q38 -22 76 0 l6 74 q-44 16 -88 0 z" fill="#10b981" />
      <path d="M92 150 q38 -22 76 0 l3 34 q-41 14 -82 0 z" fill="#0d9488" opacity="0.5" />

      {/* head */}
      <circle cx="130" cy="112" r="34" fill="#f6c9a8" />
      {/* hair */}
      <path d="M96 108 a34 34 0 0 1 68 0 q-10 -6 -18 -2 q-8 -8 -18 -4 q-10 -3 -18 4 q-8 -2 -14 2 z" fill="#3f2d23" />
      {/* face */}
      <circle cx="120" cy="112" r="3.4" fill="#3f2d23" />
      <circle cx="142" cy="112" r="3.4" fill="#3f2d23" />
      <path d="M122 124 q8 7 16 0" stroke="#3f2d23" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="112" cy="122" r="4" fill="#f59e0b" opacity="0.35" />
      <circle cx="150" cy="122" r="4" fill="#f59e0b" opacity="0.35" />

      {/* arms hugging the books */}
      <path d="M96 168 q-16 20 4 40" stroke="#10b981" strokeWidth="20" fill="none" strokeLinecap="round" />
      <path d="M164 168 q16 20 -4 40" stroke="#10b981" strokeWidth="20" fill="none" strokeLinecap="round" />

      {/* stack of books */}
      <g>
        <rect x="82" y="198" width="96" height="20" rx="4" fill="#8b5cf6" />
        <rect x="82" y="198" width="10" height="20" fill="#ffffff" opacity="0.35" />
        <rect x="88" y="180" width="88" height="20" rx="4" fill="#facc15" />
        <rect x="88" y="180" width="10" height="20" fill="#ffffff" opacity="0.35" />
        <rect x="78" y="216" width="104" height="20" rx="4" fill="#2dd4bf" />
        <rect x="78" y="216" width="10" height="20" fill="#ffffff" opacity="0.35" />
      </g>
      {/* hands */}
      <circle cx="86" cy="206" r="10" fill="#f6c9a8" />
      <circle cx="174" cy="206" r="10" fill="#f6c9a8" />

      {/* floating spark */}
      <circle cx="196" cy="96" r="6" fill="#facc15" />
      <path d="M40 120 l8 -8 M40 136 l14 -14" stroke="#0f172a" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
