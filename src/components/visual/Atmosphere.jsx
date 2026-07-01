import { memo } from "react";

/**
 * Atmosphere — the fixed backdrop for the whole app.
 * Obsidian base + drifting aurora blobs in the brand spectrum +
 * a fine technical grid that fades toward the horizon.
 */
function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-obsidian">
      {/* deep vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, rgba(124,108,255,0.18), transparent 55%), radial-gradient(90% 70% at 85% 20%, rgba(56,214,255,0.12), transparent 60%), radial-gradient(80% 80% at 10% 90%, rgba(47,224,192,0.08), transparent 60%)",
        }}
      />

      {/* drifting aurora orbs */}
      <div
        className="absolute -left-40 top-[-10%] h-[55vw] w-[55vw] rounded-full opacity-[0.5] blur-[120px]"
        style={{ background: "radial-gradient(circle, #7c6cff 0%, transparent 65%)", animation: "auroraDrift 22s ease-in-out infinite" }}
      />
      <div
        className="absolute right-[-15%] top-[20%] h-[45vw] w-[45vw] rounded-full opacity-[0.4] blur-[120px]"
        style={{ background: "radial-gradient(circle, #38d6ff 0%, transparent 65%)", animation: "auroraDrift 28s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute bottom-[-25%] left-[25%] h-[50vw] w-[50vw] rounded-full opacity-[0.28] blur-[130px]"
        style={{ background: "radial-gradient(circle, #2fe0c0 0%, transparent 65%)", animation: "auroraDrift 26s ease-in-out infinite" }}
      />

      {/* grid that dissolves downward */}
      <div
        className="bg-grid absolute inset-0 opacity-60"
        style={{ maskImage: "linear-gradient(180deg, black, transparent 80%)", WebkitMaskImage: "linear-gradient(180deg, black, transparent 80%)" }}
      />

      {/* top + bottom fades to seat content */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-obsidian to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-obsidian to-transparent" />
    </div>
  );
}

export default memo(Atmosphere);
