import Logo from "../components/Logo";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Brain, TrendingDown, BookOpen, Sparkles,
  Activity, Upload, Gauge, Bot, ChevronRight,
} from "lucide-react";
import Button from "../components/Button";
import Magnetic from "../components/ui/Magnetic";
import SpotlightCard from "../components/ui/SpotlightCard";
import { Reveal, Stagger, StaggerItem } from "../components/ui/Reveal";
import StudyMascot from "../components/visual/StudyMascot";
import NumberTicker from "../components/ui/NumberTicker";
import RiskBadge from "../components/ui/RiskBadge";

const STEPS = [
  { n: "01", icon: Upload, title: "Log a study session", body: "Add topics by hand or drop a PDF — the app reads the whole document and extracts the key topics, then you enter quiz score and confidence." },
  { n: "02", icon: Gauge, title: "Forecast the decay", body: "An Ebbinghaus-curve model converts your inputs into a live forget-risk, sorting every topic into Low, Medium or High." },
  { n: "03", icon: Activity, title: "Revise at the right moment", body: "Get a ranked revision queue and one-tap study material so you review exactly as a memory is about to fade — never too early, never too late." },
];

const FEATURES = [
  { icon: Brain, glow: "16,185,129", title: "Intelligent tracker", body: "Durations, difficulty, confidence and quiz scores roll up into one retention index across every topic." },
  { icon: TrendingDown, glow: "245,158,11", title: "Decay forecasting", body: "See forgetting before it happens. Each topic glows in its own risk colour so priorities are obvious at a glance." },
  { icon: BookOpen, glow: "13,148,136", title: "Smart study material", body: "Every topic links straight to curated YouTube, article and Wikipedia searches for instant, focused revision." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      {/* ───────────── HERO ───────────── */}
      <section className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* faint closed-book watermark in the empty lower-left area */}
        <svg
          aria-hidden
          className="pointer-events-none absolute left-[27%] top-1/2 z-0 hidden h-[24rem] w-[24rem] opacity-[0.08] lg:block xl:h-[27rem] xl:w-[27rem]"
          style={{ transform: "translate(-50%, -50%) rotate(-10deg)" }}
          viewBox="0 0 200 240"
          fill="none"
        >
          <rect x="150" y="30" width="16" height="182" rx="5" fill="#0d9488" />
          <rect x="152" y="34" width="6" height="174" rx="3" fill="#ffffff" opacity="0.5" />
          <rect x="26" y="20" width="138" height="196" rx="12" fill="#10b981" />
          <rect x="26" y="20" width="22" height="196" rx="10" fill="#0d9488" />
          <rect x="64" y="74" width="74" height="9" rx="4.5" fill="#ffffff" opacity="0.65" />
          <rect x="64" y="96" width="52" height="9" rx="4.5" fill="#ffffff" opacity="0.4" />
          <path d="M118 20 v46 l-11 -11 l-11 11 v-46 z" fill="#facc15" />
        </svg>
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 py-1.5"
          >
            <Sparkles size={14} className="text-signal" />
            <span className="mono text-[11px] tracking-[0.18em] text-muted">
              MEMORY-DECAY FORECASTING
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-5 text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-6xl"
          >
            Stop cramming.
            <br />
            Start <span className="text-gradient">retaining</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-4 max-w-xl text-base leading-relaxed text-muted"
          >
            Decay tracks how your knowledge fades on the Ebbinghaus forgetting curve,
            forecasts which topics you're about to lose, and tells you exactly what to
            revise today.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Link to="/dashboard">
                <Button size="lg">
                  Open the dashboard <ArrowRight size={18} />
                </Button>
              </Link>
            </Magnetic>
            <Link to="/signup">
              <Button variant="outline" size="lg">
                Create account
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-8 flex flex-wrap gap-6"
          >
            {[
              { v: 90, s: "%", label: "of forgetting happens in days" },
              { v: 3, s: "", label: "risk tiers, live-scored" },
              { v: 100, s: "%", label: "of your data stays on-device" },
            ].map((m) => (
              <div key={m.label}>
                <div className="font-display text-3xl font-semibold text-ink">
                  <NumberTicker value={m.v} suffix={m.s} />
                </div>
                <div className="mt-1 max-w-[140px] text-xs text-faint">{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Brand panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10"
        >
          <div className="relative overflow-hidden rounded-[26px] bg-emerald-500 p-8 text-white shadow-[0_30px_70px_-34px_rgba(16,185,129,0.6)]">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 460 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <circle cx="70" cy="80" r="72" fill="#0d9488" opacity="0.5" />
              <circle cx="420" cy="120" r="26" fill="#facc15" />
              <circle cx="430" cy="470" r="18" fill="#2dd4bf" />
              <circle cx="40" cy="430" r="9" fill="#ffffff" opacity="0.6" />
              <path d="M330 300 q22 -20 44 0 t44 0" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
              {/* floating tilted book, top-right */}
              <g transform="translate(372 44) rotate(14)" opacity="0.9">
                <rect x="0" y="0" width="46" height="34" rx="4" fill="#0b3b32" opacity="0.55" />
                <rect x="0" y="0" width="7" height="34" fill="#facc15" opacity="0.8" />
              </g>
            </svg>

            <div className="relative z-10 flex items-center justify-between">
              <Logo size={40} tone="light" />
              <span className="rounded-full bg-emerald-950/25 px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
                Beat the curve
              </span>
            </div>

            <div className="relative z-10 mt-6 flex items-end justify-between gap-4">
              <div>
                <div className="font-display text-3xl font-bold leading-[1.05] text-emerald-950">
                  Your memory,<br />mapped.
                </div>
                <p className="mt-3 max-w-[15rem] text-sm font-medium text-white/90">
                  Every topic sorted into a risk tier, so you always know what to revise next.
                </p>
              </div>
              <StudyMascot className="hidden h-40 w-auto shrink-0 drop-shadow-xl sm:block" />
            </div>

            {/* retention strip — live overall score + decay sparkline */}
            <div className="relative z-10 mt-6 flex items-center gap-4 rounded-2xl bg-emerald-950/15 p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div>
                <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/70">
                  Overall retention
                </div>
                <div className="font-display text-3xl font-bold leading-none text-white">
                  <NumberTicker value={84} suffix="%" />
                </div>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1.5">
                <svg width="112" height="40" viewBox="0 0 112 40" fill="none" aria-hidden="true">
                  <path d="M2 6 C 26 8, 40 20, 58 26 S 92 36, 110 37" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M2 6 C 26 8, 40 20, 58 26 S 92 36, 110 37 L110 40 L2 40 Z" fill="#ffffff" fillOpacity="0.12" />
                  <circle cx="2" cy="6" r="3" fill="#facc15" />
                  <circle cx="110" cy="37" r="3" fill="#f59e0b" />
                </svg>
                <span className="mono text-[9px] uppercase tracking-[0.18em] text-white/60">
                  forgetting curve
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Binary Search", risk: "Low", meter: 1 },
                { label: "Graph Algos", risk: "Medium", meter: 2 },
                { label: "Dynamic Prog.", risk: "High", meter: 3 },
              ].map((t) => (
                <div key={t.label} className="rounded-xl bg-white/95 p-3">
                  <div className="truncate text-xs font-medium text-slate-500">{t.label}</div>
                  <div className="mt-2"><RiskBadge risk={t.risk} withDot={false} /></div>
                  <div className="mt-2.5 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1 flex-1 rounded-full"
                        style={{
                          background:
                            i < t.meter
                              ? t.meter === 1
                                ? "#10b981"
                                : t.meter === 2
                                ? "#f59e0b"
                                : "#ef4444"
                              : "#e2e8f0",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ───────────── HOW IT WORKS ───────────── */}
      <section>
        <Reveal className="mb-12 text-center">
          <span className="eyebrow">The loop</span>
          <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">
            Three steps to <span className="text-gradient">durable memory</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            A closed loop between studying, forecasting and revising — so nothing you
            learn quietly slips away.
          </p>
        </Reveal>

        <Stagger className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <StaggerItem key={s.n}>
              <SpotlightCard className="h-full p-7">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50">
                    <s.icon size={20} className="text-emerald-600" />
                  </span>
                  <span className="font-display text-4xl font-semibold text-emerald-950/[0.08]">{s.n}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ───────────── FEATURES ───────────── */}
      <section>
        <Reveal className="mb-12 text-center">
          <span className="eyebrow">Inside the lab</span>
          <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Everything to beat forgetting</h2>
        </Reveal>

        <Stagger className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <SpotlightCard className="h-full p-7" glow={f.glow}>
                <span
                  className="grid h-12 w-12 place-items-center rounded-2xl"
                  style={{ background: `rgba(${f.glow},0.12)`, border: `1px solid rgba(${f.glow},0.3)` }}
                >
                  <f.icon size={22} style={{ color: `rgb(${f.glow})` }} />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ───────────── DASHBOARD PREVIEW ───────────── */}
      <section>
        <Reveal className="mb-12 text-center">
          <span className="eyebrow">At a glance</span>
          <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Your retention, rendered</h2>
        </Reveal>

        <Reveal>
          <SpotlightCard className="overflow-hidden p-0" glow="16,185,129">
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-lost/80" />
              <span className="h-3 w-3 rounded-full bg-decaying/80" />
              <span className="h-3 w-3 rounded-full bg-retained/80" />
              <span className="mono ml-3 text-[11px] tracking-[0.18em] text-faint">
                KNOWLEDGE DECAY ANALYTICS PANEL
              </span>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface-2 p-5">
                <div className="text-sm text-muted">Memory retention score</div>
                <div className="mt-1 font-display text-5xl font-semibold text-gradient">
                  <NumberTicker value={84} suffix="%" />
                </div>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "84%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#0d9488)]"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                {[
                  { t: "Dynamic Programming", r: "High" },
                  { t: "Graph Algorithms", r: "Medium" },
                  { t: "Binary Search", r: "Low" },
                ].map((row) => (
                  <div key={row.t} className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
                    <span className="text-sm text-ink">{row.t}</span>
                    <RiskBadge risk={row.r} />
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </Reveal>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line glass-strong px-6 py-16 text-center sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 120% at 50% 0%, rgba(16,185,129,0.22), transparent 60%)" }}
        />
        <Reveal className="relative z-10">
          <Bot size={34} className="mx-auto text-signal" />
          <h2 className="mt-5 text-4xl font-semibold sm:text-5xl">
            Study smarter, forget less
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Join learners who use the forgetting curve to time their revision perfectly
            and walk into every exam with knowledge that actually sticks.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link to="/dashboard">
                <Button variant="accent" size="lg">
                  Get started now <ChevronRight size={18} />
                </Button>
              </Link>
            </Magnetic>
            <Link to="/login">
              <Button variant="secondary" size="lg">I already have an account</Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
