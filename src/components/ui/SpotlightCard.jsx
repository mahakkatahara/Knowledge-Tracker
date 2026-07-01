import { useRef, useState, useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "../../lib/cn";

/**
 * SpotlightCard — a glass panel that lights a soft radial glow under the
 * cursor and brightens its border on hover. `glow` tints the spotlight
 * (e.g. a topic's risk colour). The signature surface of the whole app.
 */
export default function SpotlightCard({
  children,
  className,
  glow = "124,108,255", // synapse, as "r,g,b"
  interactive = true,
  ...rest
}) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback(
    (e) => {
      if (!interactive) return;
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      mx.set(e.clientX - r.left);
      my.set(e.clientY - r.top);
    },
    [interactive, mx, my]
  );

  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, rgba(${glow}, 0.16), transparent 70%)`;
  const border = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgba(${glow}, 0.55), transparent 65%)`;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn("group relative overflow-hidden rounded-[var(--radius-lg)] glass", className)}
      {...rest}
    >
      {/* glowing border layer */}
      {interactive && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
          style={{ background: border, opacity: hovered ? 1 : 0, mixBlendMode: "screen" }}
        />
      )}
      {/* inner mask so only the 1px rim shows the glow */}
      {interactive && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-[1px] rounded-[inherit]"
          style={{
            background:
              "linear-gradient(180deg, rgba(16,19,31,0.86), rgba(9,11,20,0.92))",
            backdropFilter: "blur(18px)",
          }}
        />
      )}
      {/* cursor spotlight fill */}
      {interactive && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: spotlight, opacity: hovered ? 1 : 0 }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
