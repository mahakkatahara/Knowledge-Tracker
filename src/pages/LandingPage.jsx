import { lazy, Suspense } from "react";
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
import DecayCurve from "../components/visual/DecayCurve";
import NumberTicker from "../components/ui/NumberTicker";
import RiskBadge from "../components/ui/RiskBadge";

const NeuralField = lazy(() => import("../components/visual/NeuralField"));

/* Decide once, on the client, whether to mount the heavy 3D field:
   skip it for reduced-motion users and small screens. */
const CAN_RENDER_3D =
  typeof window !== "undefined" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  window.innerWidth >= 768;

const STEPS = [
  { n: "01", icon: Upload, title: "Log a study session", body: "Add topics by hand or drop a PDF — the app reads the whole document and extracts the key topics, then you enter quiz score and confidence." },
  { n: "02", icon: Gauge, title: "Forecast the decay", body: "An Ebbinghaus-curve model converts your inputs into a live forget-risk, sorting every topic into Low, Medium or High." },
  { n: "03", icon: Activity, title: "Revise at the right moment", body: "Get a ranked revision queue and one-tap study material so you review exactly as a memory is about to fade — never too early, never too late." },
];

const FEATURES = [
  { icon: Brain, glow: "124,108,255", title: "Intelligent tracker", body: "Durations, difficulty, confidence and quiz scores roll up into one retention index across every topic." },
  { icon: TrendingDown, glow: "255,82,122", title: "Decay forecasting", body: "See forgetting before it happens. Each topic glows in its own risk colour so priorities are obvious at a glance." },
  { icon: BookOpen, glow: "47,224,192", title: "Smart study material", body: "Every topic links straight to curated YouTube, article and Wikipedia searches for instant, focused revision." },
];

export default function LandingPage() {
  const show3D = CAN_RENDER_3D;

  return (
    <div className="flex flex-col gap-28 sm:gap-36">
      {/* ───────────── HERO ───────────── */}
      <section className="relative -mt-6 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* 3D synaptic field */}
        {show3D && (
          <div className="pointer-events-none absolute inset-x-0 -top-24 hidden h-[120%] w-full opacity-90 md:block lg:left-1/4 lg:w-3/4">
            <Suspense fallback={null}>
              <NeuralField />
            </Suspense>
          </div>
        )}

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.04] px-3.5 py-1.5"
          >
            <Sparkles size={14} className="text-signal" />
            <span className="mono text-[11px] tracking-[0.18em] text-muted">
              AI MEMORY-DECAY FORECASTING
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-6 text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl"
          >
            Stop cramming.
            <br />
            Start <span className="text-gradient">retaining</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            Decay tracks how your knowledge fades on the Ebbinghaus forgetting curve,
            forecasts which topics you're about to lose, and tells you exactly what to
            revise today.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-3"
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
            className="mt-12 flex flex-wrap gap-8"
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

        {/* Live curve panel */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="relative z-10"
        >
          <SpotlightCard className="p-6" glow="56,214,255">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-retained animate-pulse-glow" />
                <span className="mono text-[11px] tracking-[0.2em] text-muted">
                  FORGETTING CURVE · LIVE
                </span>
              </div>
              <span className="mono text-[11px] text-faint">R = e⁻ᵗ/S</span>
            </div>
            <DecayCurve retention={62} className="h-48 w-full" />
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: "Binary Search", risk: "Low" },
                { label: "Graph Algos", risk: "Medium" },
                { label: "Dynamic Prog.", risk: "High" },
              ].map((t) => (
                <div key={t.label} className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="truncate text-xs text-muted">{t.label}</div>
                  <div className="mt-2"><RiskBadge risk={t.risk} withDot={false} /></div>
                </div>
              ))}
            </div>
          </SpotlightCard>
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
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white/[0.04]">
                    <s.icon size={20} className="text-signal" />
                  </span>
                  <span className="font-display text-4xl font-semibold text-white/10">{s.n}</span>
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
          <SpotlightCard className="overflow-hidden p-0" glow="124,108,255">
            <div className="flex items-center gap-2 border-b border-line bg-white/[0.02] px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-lost/80" />
              <span className="h-3 w-3 rounded-full bg-decaying/80" />
              <span className="h-3 w-3 rounded-full bg-retained/80" />
              <span className="mono ml-3 text-[11px] tracking-[0.18em] text-faint">
                KNOWLEDGE DECAY ANALYTICS PANEL
              </span>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white/[0.02] p-5">
                <div className="text-sm text-muted">Memory retention score</div>
                <div className="mt-1 font-display text-5xl font-semibold text-gradient">
                  <NumberTicker value={84} suffix="%" />
                </div>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "84%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7c6cff,#38d6ff,#2fe0c0)]"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                {[
                  { t: "Dynamic Programming", r: "High" },
                  { t: "Graph Algorithms", r: "Medium" },
                  { t: "Binary Search", r: "Low" },
                ].map((row) => (
                  <div key={row.t} className="flex items-center justify-between rounded-xl border border-line bg-white/[0.02] px-4 py-3">
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
          style={{ background: "radial-gradient(60% 120% at 50% 0%, rgba(124,108,255,0.25), transparent 60%)" }}
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
