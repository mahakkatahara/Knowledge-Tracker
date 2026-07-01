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
    "text-white bg-[linear-gradient(100deg,#7c6cff,#38d6ff)] shadow-[0_8px_30px_-8px_rgba(124,108,255,0.7)] hover:shadow-[0_10px_40px_-8px_rgba(56,214,255,0.8)] border border-white/10",
  accent:
    "text-[#04201c] bg-[linear-gradient(100deg,#2fe0c0,#38d6ff)] shadow-[0_8px_30px_-8px_rgba(47,224,192,0.7)] border border-white/10 font-semibold",
  secondary:
    "text-ink bg-white/[0.06] hover:bg-white/[0.10] border border-line backdrop-blur",
  danger:
    "text-white bg-[linear-gradient(100deg,#ff527a,#ff8a5c)] shadow-[0_8px_30px_-8px_rgba(255,82,122,0.7)] border border-white/10",
  outline:
    "text-synapse-bright bg-transparent border border-[rgba(124,108,255,0.45)] hover:bg-[rgba(124,108,255,0.10)]",
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
