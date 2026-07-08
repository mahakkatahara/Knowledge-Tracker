import { motion } from "framer-motion";
import { cn } from "../lib/cn";

/**
 * Button — premium variant button. Same public API as before
 * (variant, size, disabled, className, ...props) so every existing
 * call site keeps working; only the looks changed.
 *
 * variants: primary | accent | secondary | danger | outline
 * sizes:    sm | md | lg
 */
const VARIANTS = {
  primary:
    "text-white bg-[linear-gradient(100deg,#10b981,#0d9488)] shadow-[0_8px_24px_-10px_rgba(16,185,129,0.6)] hover:shadow-[0_12px_32px_-10px_rgba(13,148,136,0.7)] border border-white/10",
  accent:
    "text-white bg-[linear-gradient(100deg,#10b981,#0d9488)] shadow-[0_8px_24px_-10px_rgba(16,185,129,0.6)] border border-white/10 font-semibold",
  secondary:
    "text-ink bg-slate-100 hover:bg-slate-200 border border-line",
  danger:
    "text-white bg-[linear-gradient(100deg,#ef4444,#f97316)] shadow-[0_8px_24px_-10px_rgba(239,68,68,0.6)] border border-white/10",
  outline:
    "text-emerald-700 bg-transparent border border-emerald-500/50 hover:bg-emerald-50",
};

const SIZES = {
  sm: "px-3.5 py-2 text-[13px] rounded-[10px] gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-[12px] gap-2",
  lg: "px-7 py-3.5 text-[15px] rounded-[14px] gap-2",
};

const Button = ({
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  children,
  ...props
}) => {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden font-medium tracking-tight transition-colors duration-200 will-change-transform",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian",
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {/* sheen sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.35),transparent)] transition-transform duration-700 group-hover:translate-x-full"
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-[inherit]">
        {children}
      </span>
    </motion.button>
  );
};

export default Button;
