import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Reveal — fades + lifts a block into view as it enters the viewport.
 * `as` lets it render any tag; `delay` staggers grouped reveals.
 */
export function Reveal({ children, delay = 0, y = 26, className, once = true, ...rest }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its Reveal/StaggerItem children. */
export function Stagger({ children, className, gap = 0.08, ...rest }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, y = 22, ...rest }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y, filter: "blur(6px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { EASE };
