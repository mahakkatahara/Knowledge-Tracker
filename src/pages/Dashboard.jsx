import { useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Flame, AlertTriangle, Clock, Calendar, Award, TrendingUp, BookOpen, FileText, ArrowUpRight } from "lucide-react";
import useLocalStorage from "../hooks/useLocalStorage";
import { INITIAL_TOPICS } from "../utils/mockData";
import Card from "../components/Card";
import Button from "../components/Button";
import { getRevisionRecommendations, localTodayISO } from "../utils/decayEngine";
import { withDerivedSessions, weeklyStats, computeStreak } from "../utils/sessionLog";
import { AuthContext } from "../context/AuthContext";
import { Reveal, Stagger, StaggerItem } from "../components/ui/Reveal";
import NumberTicker from "../components/ui/NumberTicker";
import RiskBadge from "../components/ui/RiskBadge";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const uid = user?.email || "guest";
  const [topics] = useLocalStorage(`kt_topics::${uid}`, INITIAL_TOPICS);
  const [quizHistory] = useLocalStorage(`kt_quiz_history::${uid}`, []);
  const [sessions] = useLocalStorage(`kt_sessions::${uid}`, []);

  // A single, live "today" (local) used for every date calculation on this page,
  // so "days ago", streak and the weekly chart never drift out of sync.
  const today = localTodayISO();

  // ── business logic ─────────────────────────────────────────
  const annotatedTopics = getRevisionRecommendations(topics, today);

  const highRiskTopics = annotatedTopics.filter((t) => t.risk === "High");
  const highRiskCount = highRiskTopics.length;
  const medRiskCount = annotatedTopics.filter((t) => t.risk === "Medium").length;
  const lowRiskCount = annotatedTopics.filter((t) => t.risk === "Low").length;

  const totalRetentionSum = annotatedTopics.reduce((sum, topic) => sum + topic.retentionVal, 0);
  const averageRetention = topics.length > 0 ? Math.round(totalRetentionSum / topics.length) : 0;

  const upcomingRevisions = annotatedTopics.filter((t) => t.daysElapsed >= 2 || t.risk === "High");

  const topicDivisor = Math.max(1, topics.length);

  // Real study time & streak come from the append-only session log — one record
  // per actual study/revision/quiz event — NOT from re-bucketing each topic's
  // single static `duration`. `withDerivedSessions` backfills a session for any
  // older topic that predates the log, so nothing silently disappears.
  const allSessions = withDerivedSessions(sessions, topics);
  const { weekHours: studyTimeHours, barData, todayLabel } = weeklyStats(allSessions, today);
  const streak = computeStreak(allSessions, today);
  const maxHours = Math.max(5, ...barData.map((b) => b.hours));
  // ───────────────────────────────────────────────────────────

  const metrics = [
    { icon: Brain, glow: "16,185,129", title: "Memory retention", value: averageRetention, suffix: "%", sub: "Heuristic forecast index", color: "text-synapse-bright" },
    { icon: Flame, glow: "245,158,11", title: "Study streak", value: streak, suffix: "", unit: "days", sub: "Active daily streak", color: "text-decaying" },
    { icon: AlertTriangle, glow: "239,68,68", title: "High-risk topics", value: highRiskCount, suffix: "", sub: "Need revision now", color: "text-lost" },
    { icon: Clock, glow: "13,148,136", title: "Study time", value: Number(studyTimeHours), suffix: "h", decimals: 1, sub: "Logged this week", color: "text-signal" },
  ];

  const dist = [
    { label: "High risk · decay predicted", count: highRiskCount, color: "#ef4444" },
    { label: "Medium risk", count: medRiskCount, color: "#f59e0b" },
    { label: "Low risk · retained", count: lowRiskCount, color: "#10b981" },
  ];

  return (
    <div className="relative flex flex-col gap-8">
      {/* faint closed-book watermark — centered, slightly tilted */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[24rem] w-[24rem] opacity-[0.055] sm:h-[30rem] sm:w-[30rem]"
        style={{ transform: "translate(-50%, -50%) rotate(-12deg)" }}
        viewBox="0 0 200 240"
        fill="none"
      >
        {/* page edges peeking on the right */}
        <rect x="150" y="30" width="16" height="182" rx="5" fill="#0d9488" />
        <rect x="152" y="34" width="6" height="174" rx="3" fill="#ffffff" opacity="0.5" />
        {/* front cover */}
        <rect x="26" y="20" width="138" height="196" rx="12" fill="#10b981" />
        {/* spine */}
        <rect x="26" y="20" width="22" height="196" rx="10" fill="#0d9488" />
        {/* title lines on the cover */}
        <rect x="64" y="74" width="74" height="9" rx="4.5" fill="#ffffff" opacity="0.65" />
        <rect x="64" y="96" width="52" height="9" rx="4.5" fill="#ffffff" opacity="0.4" />
        {/* bookmark ribbon (amber, like the logo spark) */}
        <path d="M118 20 v46 l-11 -11 l-11 11 v-46 z" fill="#facc15" />
      </svg>
      {/* Header */}
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Command center</span>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Revision dashboard</h1>
          <p className="mt-2 text-muted">Real-time memory stats & simulated forgetting forecasts.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line glass px-4 py-2 text-sm text-muted">
          <Calendar size={15} className="text-signal" />
          <span className="mono text-xs">
            {new Date(today + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </Reveal>

      {/* Profile banner */}
      {user && (
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line glass-strong p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: "radial-gradient(70% 130% at 0% 0%, rgba(16,185,129,0.14), transparent 55%), radial-gradient(60% 120% at 100% 100%, rgba(13,148,136,0.12), transparent 55%)" }}
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#10b981,#0d9488)] text-xl font-bold text-white glow-synapse">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Welcome back, {user.name}</h2>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-5 py-3">
                  <FileText size={18} className="text-synapse-bright" />
                  <div>
                    <div className="mono text-[10px] uppercase tracking-[0.12em] text-faint">Quizzes taken</div>
                    <div className="text-xl font-semibold">{quizHistory.length}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-5 py-3">
                  <BookOpen size={18} className="text-signal" />
                  <div>
                    <div className="mono text-[10px] uppercase tracking-[0.12em] text-faint">Study sessions</div>
                    <div className="text-xl font-semibold">{topics.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Metric cards */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <StaggerItem key={m.title}>
            <div className="group relative h-full overflow-hidden rounded-[var(--radius-lg)] border border-line glass p-5 transition-transform duration-300 hover:-translate-y-1">
              <span
                className="relative grid h-11 w-11 place-items-center rounded-xl"
                style={{ background: `rgba(${m.glow},0.12)`, border: `1px solid rgba(${m.glow},0.3)` }}
              >
                <m.icon size={20} style={{ color: `rgb(${m.glow})` }} />
              </span>
              <div className="mono mt-4 text-[10px] uppercase tracking-[0.14em] text-faint">{m.title}</div>
              <div className={`mt-1 font-display text-3xl font-semibold ${m.color}`}>
                <NumberTicker value={m.value} decimals={m.decimals || 0} suffix={m.suffix} />
                {m.unit && <span className="ml-1.5 text-base text-muted">{m.unit}</span>}
              </div>
              <div className="mt-1 text-xs text-muted">{m.sub}</div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <Reveal>
            <Card title="Weekly study hours">
              <div className="flex h-52 items-end justify-between gap-2 pt-4">
                {barData.map((d) => {
                  const pct = (d.hours / maxHours) * 100;
                  const today = d.day === todayLabel;
                  return (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                      <span className="mono text-[10px] text-muted">{d.hours}</span>
                      <div className="relative flex w-full max-w-[34px] flex-1 items-end overflow-hidden rounded-lg bg-emerald-50">
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                          className="w-full rounded-lg"
                          style={{
                            background: today
                              ? "linear-gradient(180deg,#10b981,#059669)"
                              : "linear-gradient(180deg,#5eead4,#2dd4bf)",
                            boxShadow: today ? "0 0 18px rgba(16,185,129,0.45)" : "none",
                          }}
                        />
                      </div>
                      <span className={`mono text-[10px] ${today ? "text-retained" : "text-faint"}`}>{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card title="Forget-risk distribution">
              <div className="px-5 pb-6 sm:px-6">
                {topics.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">
                    No topics yet — add some in the tracker to see your risk breakdown.
                  </p>
                ) : (
                  <>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
                      {dist.map((d) => {
                        const w = (d.count / topicDivisor) * 100;
                        if (w <= 0) return null;
                        return (
                          <motion.div
                            key={d.label}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${w}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full"
                            style={{ background: d.color }}
                          />
                        );
                      })}
                    </div>

                    <div className="mt-6 flex flex-col gap-4">
                      {dist.map((d) => {
                        const pct = Math.round((d.count / topicDivisor) * 100);
                        return (
                          <div key={d.label} className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                            <span className="flex-1 text-sm text-muted">{d.label}</span>
                            <span className="mono text-xs text-faint">{pct}%</span>
                            <span className="font-display w-6 text-right text-base font-semibold" style={{ color: d.color }}>{d.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </Reveal>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Reveal>
            <Card title="Immediate revisions recommended">
              {highRiskTopics.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-retained/30 bg-retained/10">
                    <Award size={26} className="text-retained" />
                  </span>
                  <p className="max-w-xs text-sm text-muted">
                    Excellent memory score — no topics are in High-risk decay right now.
                  </p>
                </div>
              ) : (
                <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1">
                  {highRiskTopics.map((topic) => (
                    <div key={topic.id} className="flex items-center justify-between gap-3 rounded-2xl border border-lost/25 bg-lost/[0.06] p-4">
                      <div>
                        <h4 className="font-medium text-ink">{topic.title}</h4>
                        <p className="mt-0.5 text-xs text-muted">
                          Retention <span className="mono font-semibold text-lost">{topic.retentionVal}%</span> · Quiz {topic.quizScore}%
                        </p>
                      </div>
                      <Link to="/chat">
                        <Button variant="outline" size="sm">Ask AI <ArrowUpRight size={14} /></Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Reveal>

          <Reveal>
            <Card title="Upcoming revision queue">
              {upcomingRevisions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No upcoming revisions scheduled.</p>
              ) : (
                <div className="flex max-h-[26rem] flex-col gap-2.5 overflow-y-auto pr-1">
                  {upcomingRevisions.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-ink">{rev.title}</div>
                        <div className="text-xs text-faint">Studied {rev.daysElapsed} days ago</div>
                      </div>
                      <RiskBadge risk={rev.risk} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Reveal>
        </div>
      </div>

      {/* CTA */}
      <Reveal className="flex justify-center pt-2">
        <Link to="/tracker">
          <Button size="lg">
            <TrendingUp size={16} /> Log study activity
          </Button>
        </Link>
      </Reveal>
    </div>
  );
};

export default Dashboard;
