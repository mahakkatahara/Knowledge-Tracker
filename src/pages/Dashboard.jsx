import { useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Flame, AlertTriangle, Clock, Calendar, Award, TrendingUp, BookOpen, FileText, ArrowUpRight } from "lucide-react";
import useLocalStorage from "../hooks/useLocalStorage";
import { INITIAL_TOPICS } from "../utils/mockData";
import Card from "../components/Card";
import Button from "../components/Button";
import { getRevisionRecommendations, getDaysElapsed, REFERENCE_DATE } from "../utils/decayEngine";
import { AuthContext } from "../context/AuthContext";
import { Reveal, Stagger, StaggerItem } from "../components/ui/Reveal";
import NumberTicker from "../components/ui/NumberTicker";
import RiskBadge from "../components/ui/RiskBadge";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const uid = user?.email || "guest";
  const [topics] = useLocalStorage(`kt_topics::${uid}`, INITIAL_TOPICS);
  const [quizHistory] = useLocalStorage(`kt_quiz_history::${uid}`, []);

  // ── business logic (unchanged) ─────────────────────────────
  const annotatedTopics = getRevisionRecommendations(topics);

  const highRiskTopics = annotatedTopics.filter((t) => t.risk === "High");
  const highRiskCount = highRiskTopics.length;
  const medRiskCount = annotatedTopics.filter((t) => t.risk === "Medium").length;
  const lowRiskCount = annotatedTopics.filter((t) => t.risk === "Low").length;

  const totalRetentionSum = annotatedTopics.reduce((sum, topic) => sum + topic.retentionVal, 0);
  const averageRetention = topics.length > 0 ? Math.round(totalRetentionSum / topics.length) : 0;

  const upcomingRevisions = annotatedTopics.filter((t) => t.daysElapsed >= 2 || t.risk === "High");

  const topicDivisor = Math.max(1, topics.length);

  const studyTimeHours = (
    topics
      .filter((t) => getDaysElapsed(t.lastStudied) <= 7)
      .reduce((sum, t) => sum + (Number(t.duration) || 0), 0) / 60
  ).toFixed(1);

  const computeStreak = () => {
    const days = new Set(topics.map((t) => t.lastStudied).filter(Boolean));
    if (days.size === 0) return 0;
    let streak = 0;
    let cursor = new Date(REFERENCE_DATE);
    const isoOf = (d) => d.toISOString().split("T")[0];
    if (!days.has(isoOf(cursor))) {
      const sorted = [...days].sort().reverse();
      cursor = new Date(sorted[0]);
    }
    while (days.has(isoOf(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };
  const streak = computeStreak();

  const weekOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hoursByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const jsDayToLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  topics.forEach((t) => {
    if (!t.lastStudied) return;
    if (getDaysElapsed(t.lastStudied) > 7) return;
    const label = jsDayToLabel[new Date(t.lastStudied).getDay()];
    hoursByDay[label] += (Number(t.duration) || 0) / 60;
  });
  const barData = weekOrder.map((day) => ({ day, hours: Math.round(hoursByDay[day] * 10) / 10 }));
  const maxHours = Math.max(5, ...barData.map((b) => b.hours));
  const todayLabel = jsDayToLabel[new Date(REFERENCE_DATE).getDay()];
  // ───────────────────────────────────────────────────────────

  const metrics = [
    { icon: Brain, glow: "124,108,255", title: "Memory retention", value: averageRetention, suffix: "%", sub: "Heuristic forecast index", color: "text-synapse-bright" },
    { icon: Flame, glow: "246,181,69", title: "Study streak", value: streak, suffix: "", unit: "days", sub: "Active daily streak", color: "text-decaying" },
    { icon: AlertTriangle, glow: "255,82,122", title: "High-risk topics", value: highRiskCount, suffix: "", sub: "Need revision now", color: "text-lost" },
    { icon: Clock, glow: "56,214,255", title: "Study time", value: Number(studyTimeHours), suffix: "h", decimals: 1, sub: "Logged this week", color: "text-signal" },
  ];

  const dist = [
    { label: "High risk · decay predicted", count: highRiskCount, color: "#ff527a" },
    { label: "Medium risk", count: medRiskCount, color: "#f6b545" },
    { label: "Low risk · retained", count: lowRiskCount, color: "#2fe0c0" },
  ];

  return (
    <div className="flex flex-col gap-8">
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
            {new Date(REFERENCE_DATE + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
              style={{ background: "radial-gradient(70% 130% at 0% 0%, rgba(124,108,255,0.18), transparent 55%), radial-gradient(60% 120% at 100% 100%, rgba(56,214,255,0.14), transparent 55%)" }}
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#7c6cff,#a855f7)] text-xl font-bold text-white glow-synapse">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Welcome back, {user.name}</h2>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-black/20 px-5 py-3">
                  <FileText size={18} className="text-synapse-bright" />
                  <div>
                    <div className="mono text-[10px] uppercase tracking-[0.12em] text-faint">Quizzes taken</div>
                    <div className="text-xl font-semibold">{quizHistory.length}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-black/20 px-5 py-3">
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
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
                style={{ background: `rgb(${m.glow})` }}
              />
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
                      <div className="relative flex w-full max-w-[34px] flex-1 items-end overflow-hidden rounded-lg bg-white/[0.04]">
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                          className="w-full rounded-lg"
                          style={{
                            background: today
                              ? "linear-gradient(180deg,#2fe0c0,#38d6ff)"
                              : "linear-gradient(180deg,#7c6cff,#5a4fd6)",
                            boxShadow: today ? "0 0 18px rgba(47,224,192,0.5)" : "none",
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
              <div className="flex flex-col gap-5 pt-1">
                {dist.map((d) => (
                  <div key={d.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted">{d.label}</span>
                      <span className="mono font-semibold" style={{ color: d.color }}>{d.count}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(d.count / topicDivisor) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ background: d.color, boxShadow: `0 0 12px ${d.color}80` }}
                      />
                    </div>
                  </div>
                ))}
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
                <div className="flex flex-col gap-3">
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
                <div className="flex flex-col gap-2.5">
                  {upcomingRevisions.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/[0.02] px-4 py-3">
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
