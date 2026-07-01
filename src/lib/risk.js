/**
 * Risk colour system — the semantic spine of the design.
 * Low = retained (cyan), Medium = decaying (amber), High = lost (magenta).
 * Returned values are reused for badges, glows, charts and spotlights.
 */
export const RISK = {
  High: {
    label: "High",
    rgb: "255,82,122",
    color: "var(--color-lost)",
    text: "text-lost",
    soft: "rgba(255,82,122,0.12)",
    border: "rgba(255,82,122,0.34)",
  },
  Medium: {
    label: "Medium",
    rgb: "246,181,69",
    color: "var(--color-decaying)",
    text: "text-decaying",
    soft: "rgba(246,181,69,0.12)",
    border: "rgba(246,181,69,0.32)",
  },
  Low: {
    label: "Low",
    rgb: "47,224,192",
    color: "var(--color-retained)",
    text: "text-retained",
    soft: "rgba(47,224,192,0.12)",
    border: "rgba(47,224,192,0.32)",
  },
};

export const riskOf = (cat) => RISK[cat] || RISK.Medium;

/** Map a 0–100 retention value to a spectrum colour (lost → decaying → retained). */
export function retentionColor(v) {
  if (v >= 70) return "#2fe0c0";
  if (v >= 40) return "#f6b545";
  return "#ff527a";
}
