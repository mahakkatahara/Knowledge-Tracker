import { cn } from "../lib/cn";

/**
 * Card — glass panel
 */
const Card = ({ title, actions, className = "", children, ...props }) => {
  return (
    <div
      className={cn(
        "glass rounded-[var(--radius-lg)] transition-colors duration-300",
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="px-5 pt-5 sm:px-6 sm:pt-6 mb-4 flex items-center justify-between gap-3">
          {title && (
            <div className="flex items-center gap-2.5">
              <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#7c6cff,#38d6ff)]" />
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                {title}
              </h3>
            </div>
          )}

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* IMPORTANT */}
      <div
        className={cn(
          "flex flex-col flex-1 min-h-0",
          !(title || actions) && "h-full"
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Card;