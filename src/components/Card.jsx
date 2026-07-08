import { cn } from "../lib/cn";

/**
 * Card — glass panel
 */
const Card = ({ title, actions, className = "", noPadding = false, children, ...props }) => {
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
              <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#10b981,#0d9488)]" />
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

      {/* IMPORTANT — every card's content gets breathing room from the edges by
          default, so text/inputs never sit flush against the border. Pass
          `noPadding` for full-bleed layouts (e.g. a chat window that manages
          its own internal spacing). */}
      <div
        className={cn(
          "flex flex-col flex-1 min-h-0",
          !noPadding && "px-5 pb-5 sm:px-6 sm:pb-6",
          !noPadding && !(title || actions) && "pt-5 sm:pt-6",
          !(title || actions) && "h-full"
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Card;