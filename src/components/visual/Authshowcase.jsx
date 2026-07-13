// AuthShowcase — the rich green product-showcase panel used on the
// Login and Signup pages. Rebuilt to match the reference design:
//  · three quick-stat chips at the top
//  · a two-column grid: revision queue (with AI suggestion) + two side cards
//  · a weekly-progress card at the bottom
//  · a mascot with a floating "2 topics due today" bubble in the corner
//
// All artwork is inline SVG / CSS so nothing extra needs to ship.

import { Flame, BookOpen, TrendingUp, Sparkles } from "lucide-react";
import Logo from "../Logo";
import StudyMascot from "./StudyMascot";

/* ─────────── top chips ─────────── */
function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">
      <Icon size={14} strokeWidth={2.4} />
      {children}
    </span>
  );
}

/* ─────────── revision queue card ─────────── */
const QUEUE_ROWS = [
  { topic: "Binary Search",      tier: "Low risk",    pct: 26, color: "#10b981" },
  { topic: "Graph Algorithms",   tier: "Medium risk", pct: 58, color: "#facc15" },
  { topic: "Dynamic Programming", tier: "High risk",  pct: 88, color: "#ef4444" },
];

function RevisionQueue() {
  return (
    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-inset ring-white/20 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-white/20">
            <BookOpen size={12} strokeWidth={2.6} />
          </span>
          Today&apos;s Revision Queue
        </span>
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white">
          3 due
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {QUEUE_ROWS.map((r) => (
          <div key={r.topic}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-white">{r.topic}</span>
              <span className="text-[10px] font-semibold text-white/80">{r.tier}</span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full"
                style={{ width: `${r.pct}%`, background: r.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI suggestion */}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/12 px-3 py-2.5 ring-1 ring-inset ring-white/20">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-yellow-300" strokeWidth={2.4} />
        <p className="text-[11px] leading-snug text-white/90">
          <span className="font-semibold text-white">AI suggests:</span>{" "}
          Review Dynamic Programming first — retention drops below 20% in 6 hours.
        </p>
      </div>
    </div>
  );
}

/* ─────────── retention score card ─────────── */
function RetentionScoreCard() {
  return (
    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-inset ring-white/20 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-white/20">
          <TrendingUp size={12} strokeWidth={2.6} />
        </span>
        Retention Score
      </div>
      <div className="mt-2 text-3xl font-extrabold leading-none text-white">84%</div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-yellow-300">
        <TrendingUp size={12} strokeWidth={2.6} />
        +12% this week
      </div>
    </div>
  );
}

/* ─────────── learning streak card ─────────── */
function LearningStreakCard() {
  const filled = 5;
  const total = 7;
  return (
    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-inset ring-white/20 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-white/20">
          <Flame size={12} strokeWidth={2.6} />
        </span>
        Learning Streak
      </div>
      <div className="mt-2 text-3xl font-extrabold leading-none text-white">5 days</div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < filled ? "bg-yellow-300" : "bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────── weekly progress card ─────────── */
const WEEK = [
  { d: "M", h: 45 },
  { d: "T", h: 60 },
  { d: "W", h: 40 },
  { d: "T", h: 70 },
  { d: "F", h: 55 },
  { d: "S", h: 90, hot: true },
  { d: "S", h: 30 },
];

function WeeklyProgress() {
  return (
    <div className="relative rounded-2xl bg-white/12 p-4 ring-1 ring-inset ring-white/20 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-white/20">
            <BookOpen size={12} strokeWidth={2.6} />
          </span>
          Weekly Progress
        </span>
        <span className="text-[10px] font-semibold text-white/80">
          18 reviews completed
        </span>
      </div>

      <div className="mt-3 flex h-20 items-end gap-2">
        {WEEK.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`w-full rounded-md ${
                w.hot ? "bg-yellow-300" : "bg-white/25"
              }`}
              style={{ height: `${w.h}%` }}
            />
            <span className="text-[10px] font-semibold text-white/70">{w.d}</span>
          </div>
        ))}
      </div>

      {/* floating tooltip */}
      <div className="pointer-events-none absolute -right-1 top-11 rounded-full bg-white px-3 py-1.5 shadow-lg">
        <p className="text-[10px] font-bold text-slate-800">2 topics due today</p>
      </div>
    </div>
  );
}

/* ─────────── ambient background layer ─────────── */
function AmbientBg() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600" />
      {/* dot texture */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* soft glows */}
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-teal-700/40 blur-3xl" />
      {/* faint decoration icons */}
      <svg className="absolute right-10 top-24 h-6 w-6 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3c-2.5 3-4 5.5-4 8a4 4 0 0 0 8 0c0-2.5-1.5-5-4-8Z" />
      </svg>
      <svg className="absolute right-20 top-6 h-7 w-7 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M22 10 12 4 2 10l10 6 10-6Z" />
        <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
      </svg>
    </div>
  );
}

/* ─────────── public component ─────────── */
export default function AuthShowcase({
  heading = (
    <>
      Welcome<br />back.
    </>
  ),
  tagline = "Master your learning with intelligent spaced repetition and retention tracking.",
  bubbleText = "2 topics due today",
}) {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:p-10 lg:pb-4">
      <AmbientBg />

      {/* header */}
      <div className="relative z-10">
        <Logo size={40} tone="light" />
      </div>

      {/* headline + tagline */}
      <div className="relative z-10 mt-8">
        <h1 className="text-[56px] font-extrabold leading-[0.95] tracking-tight text-white">
          {heading}
        </h1>
        <p className="mt-4 max-w-md text-[14px] font-medium leading-relaxed text-white/85">
          {tagline}
        </p>
      </div>

      {/* chips */}
      <div className="relative z-10 mt-5 flex flex-wrap gap-2">
        <Chip icon={Flame}>5 Day Streak</Chip>
        <Chip icon={BookOpen}>4 Topics Due</Chip>
        <Chip icon={TrendingUp}>+12% Retention</Chip>
      </div>

      {/* cards grid */}
      <div className="relative z-10 mt-5 grid grid-cols-[1.35fr_1fr] gap-3">
        <RevisionQueue />
        <div className="flex flex-col gap-3">
          <RetentionScoreCard />
          <LearningStreakCard />
        </div>
      </div>

      {/* bottom row: weekly progress + mascot */}
      <div className="relative z-10 mt-3 grid grid-cols-[1.35fr_1fr] items-end gap-3">
        <WeeklyProgress />
        <div className="flex justify-end">
          <div className="relative">
            <StudyMascot className="h-36 w-auto drop-shadow-xl" />
            {/* keep bubbleText as prop so signup can override */}
            <span className="sr-only">{bubbleText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
