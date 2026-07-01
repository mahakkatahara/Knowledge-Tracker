import { cn } from "../lib/cn";

/**
 * Card — glass panel. Same API as before (title, actions, className,
 * children, ...props incl. style) so existing call sites are untouched.
 */
const Card = ({ title, actions, className = "", children, ...props }) => {
  return (
    <div
      className={cn(
        "glass rounded-[var(--radius-lg)] p-5 sm:p-6 transition-colors duration-300",
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <div className="flex items-center gap-2.5">
              <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#7c6cff,#38d6ff)]" />
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                {title}
              </h3>
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Card;
