import { useState, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Loader, CheckCircle2, XCircle, AlertTriangle, TrendingUp, RotateCcw, PlayCircle, Info } from "lucide-react";
import useLocalStorage from "../hooks/useLocalStorage";
import { INITIAL_TOPICS } from "../utils/mockData";
import Card from "../components/Card";
import Button from "../components/Button";
import { AuthContext } from "../context/AuthContext";
import { calculateRetention, getForgetRisk } from "../utils/decayEngine";
import { buildQuiz, gradeQuiz, applyQuizResults, hasAiKey } from "../utils/quizEngine";
import { Reveal } from "../components/ui/Reveal";

const STAGE = { SETUP: "setup", LOADING: "loading", QUIZ: "quiz", RESULT: "result" };

const Quiz = () => {
  const { user } = useContext(AuthContext);
  const uid = user?.email || "guest";
  const [topics, setTopics] = useLocalStorage(`kt_topics::${uid}`, INITIAL_TOPICS);
  const [history, setHistory] = useLocalStorage(`kt_quiz_history::${uid}`, []);

  const [stage, setStage] = useState(STAGE.SETUP);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Mixed");

  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("ai");
  const [genError, setGenError] = useState("");
  const [canRetryAi, setCanRetryAi] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [moved, setMoved] = useState([]);

  const aiOn = useMemo(() => hasAiKey(), []);

  const startQuiz = async () => {
    if (topics.length === 0) return;
    setStage(STAGE.LOADING);
    setGenError("");
    setAnswers({});
    const { items: qs, mode: m, error, canRetryAi: retry } = await buildQuiz({ topics, count, difficulty });
    setItems(qs);
    setMode(m);
    setCanRetryAi(!!retry);
    if (error) setGenError(error);
    else setGenError("");
    setStage(STAGE.QUIZ);
  };

  const selectAnswer = (qId, idx) => setAnswers((prev) => ({ ...prev, [qId]: idx }));

  const answeredCount = Object.keys(answers).length;

  const submitQuiz = () => {
    const graded = gradeQuiz(items, answers);
    const { updatedTopics, movedToHigh } = applyQuizResults(topics, graded, { calculateRetention, getForgetRisk });
    setTopics(updatedTopics);
    setMoved(movedToHigh);

    const overall = Math.round((graded.totalCorrect / graded.totalQuestions) * 100);
    setResult({ ...graded, overall });

    setHistory((prev) =>
      [
        {
          id: `quiz-${Date.now()}`,
          date: new Date().toISOString(),
          mode,
          difficulty,
          score: overall,
          total: graded.totalQuestions,
          correct: graded.totalCorrect,
        },
        ...prev,
      ].slice(0, 50)
    );

    setStage(STAGE.RESULT);
  };

  const reset = () => {
    setStage(STAGE.SETUP);
    setItems([]);
    setAnswers({});
    setResult(null);
    setMoved([]);
    setGenError("");
  };

  // ── styling helpers ──
  const diffTone = (d) =>
    ({ easy: "text-retained", medium: "text-decaying", hard: "text-lost", mixed: "text-signal" }[d.toLowerCase()] || "text-muted");
  const ringColor = (v) => (v >= 70 ? "#2fe0c0" : v >= 40 ? "#f6b545" : "#ff527a");

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Active recall</span>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Auto quiz</h1>
          <p className="mt-2 max-w-xl text-muted">
            Questions generated from your tracked topics. Score well and you're safe — the
            ones you fumble get pushed to High risk automatically.
          </p>
        </div>
      </Reveal>

      {/* AI status */}
      <Reveal>
        <div
          className="flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm"
          style={
            aiOn
              ? { borderColor: "rgba(47,224,192,0.3)", background: "rgba(47,224,192,0.07)", color: "#2fe0c0" }
              : { borderColor: "var(--color-line)", background: "rgba(255,255,255,0.02)", color: "var(--color-muted)" }
          }
        >
          {aiOn ? <Sparkles size={16} /> : <Info size={16} />}
          {aiOn ? (
            <span>AI question generation is <strong>ON</strong> (Gemini).</span>
          ) : (
            <span>
              No AI key found — running in <strong>self-check</strong> mode. Add{" "}
              <code className="mono rounded bg-black/40 px-1.5 py-0.5 text-xs">VITE_GEMINI_API_KEY</code> to your{" "}
              <code className="mono rounded bg-black/40 px-1.5 py-0.5 text-xs">.env</code> for real auto-generated MCQs.
            </span>
          )}
        </div>
      </Reveal>

      <AnimatePresence mode="wait">
        {/* SETUP */}
        {stage === STAGE.SETUP && (
          <motion.div key="setup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <Card title="Set up your quiz">
              {topics.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-white/[0.03]">
                    <Brain size={30} className="text-faint" />
                  </span>
                  <p className="max-w-sm text-sm text-muted">
                    No topics yet. Add some on the <strong className="text-ink">Tracker</strong> first — the quiz reads from there.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Brain size={15} className="text-synapse-bright" /> {topics.length} topic{topics.length > 1 ? "s" : ""} available to quiz from.
                  </p>

                  <div>
                    <label className="mono mb-2 block text-xs uppercase tracking-wide text-faint">Number of questions</label>
                    <div className="flex flex-wrap gap-2">
                      {[5, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setCount(n)}
                          className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition ${count === n ? "border-synapse/60 bg-synapse/15 text-synapse-bright" : "border-line bg-white/[0.02] text-muted hover:text-ink"}`}
                        >
                          {n} MCQs
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mono mb-2 block text-xs uppercase tracking-wide text-faint">Difficulty</label>
                    <div className="flex flex-wrap gap-2">
                      {["Easy", "Medium", "Hard", "Mixed"].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition ${difficulty === d ? "border-signal/60 bg-signal/15 text-signal" : "border-line bg-white/[0.02] text-muted hover:text-ink"}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button variant="primary" className="w-full sm:w-auto" onClick={startQuiz}>
                    <PlayCircle size={16} /> Start {count}-question quiz
                  </Button>

                  {history.length > 0 && (
                    <p className="mono text-xs text-faint">
                      Last attempt: {history[0].score}% ({history[0].correct}/{history[0].total}, {history[0].difficulty})
                    </p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* LOADING */}
        {stage === STAGE.LOADING && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="relative grid h-16 w-16 place-items-center">
                  <span className="absolute inset-0 rounded-full border-2 border-synapse/20" />
                  <Loader size={28} className="animate-spin text-signal" />
                </div>
                <span className="text-sm text-muted">{aiOn ? "Generating questions with AI…" : "Building your self-check…"}</span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* QUIZ */}
        {stage === STAGE.QUIZ && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <Card title={`Quiz — ${difficulty} · ${items.length} questions`}>
              {genError && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-decaying/30 bg-decaying/10 px-3 py-2.5 text-xs text-decaying">
                  <AlertTriangle size={14} />
                  <span>{genError}</span>
                  {canRetryAi && aiOn && (
                    <button className="ml-auto flex items-center gap-1 rounded-lg border border-decaying/40 px-2 py-1 transition hover:bg-decaying/15" onClick={startQuiz}>
                      <RotateCcw size={13} /> Try AI again
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-5">
                {items.map((q, i) => (
                  <div key={q.id} className="rounded-2xl border border-line bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-synapse/15 text-xs font-semibold text-synapse-bright mono">{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">{q.topicTitle}</span>
                        <span className={`mono text-[11px] font-medium ${diffTone(q.difficulty)}`}>{q.difficulty}</span>
                      </div>
                    </div>
                    <p className="mb-3 text-[15px] font-medium text-ink">{q.question}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oi) => {
                        const selected = answers[q.id] === oi;
                        return (
                          <button
                            key={oi}
                            onClick={() => selectAnswer(q.id, oi)}
                            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${selected ? "border-synapse/60 bg-synapse/15 text-ink" : "border-line bg-white/[0.02] text-muted hover:border-line-strong hover:text-ink"}`}
                          >
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-semibold mono ${selected ? "bg-synapse text-white" : "bg-white/[0.06] text-faint"}`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <span className="mono text-xs text-muted">{answeredCount}/{items.length} answered</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={submitQuiz} disabled={answeredCount < items.length}>Submit & grade</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* RESULT */}
        {stage === STAGE.RESULT && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
            <Card>
              <div className="flex flex-col items-center gap-6 py-4 sm:flex-row sm:gap-8">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 160, damping: 14 }}
                  className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(${ringColor(result.overall)} ${result.overall * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}
                >
                  <div className="grid h-32 w-32 place-items-center rounded-full bg-obsidian text-center">
                    <div>
                      <div className="font-display text-4xl font-semibold" style={{ color: ringColor(result.overall) }}>{result.overall}%</div>
                      <div className="mono mt-1 text-[11px] text-faint">{result.totalCorrect}/{result.totalQuestions} correct</div>
                    </div>
                  </div>
                </motion.div>
                <div className="text-center sm:text-left">
                  {result.overall >= 70 ? (
                    <p className="flex items-center justify-center gap-2 text-retained sm:justify-start"><CheckCircle2 size={18} /> Strong — these topics are in good shape.</p>
                  ) : result.overall >= 40 ? (
                    <p className="flex items-center justify-center gap-2 text-decaying sm:justify-start"><AlertTriangle size={18} /> Shaky in places. Check the weak topics below.</p>
                  ) : (
                    <p className="flex items-center justify-center gap-2 text-lost sm:justify-start"><XCircle size={18} /> Lots of gaps — revise the flagged topics first.</p>
                  )}
                </div>
              </div>
            </Card>

            {moved.length > 0 && (
              <Card>
                <div className="flex items-center gap-2"><TrendingUp size={16} className="text-lost" /><strong className="text-ink">Pushed to High risk ({moved.length})</strong></div>
                <p className="mt-1 text-sm text-muted">You struggled with these, so the tracker now treats them as urgent:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {moved.map((t) => (
                    <span key={t} className="rounded-full border border-lost/30 bg-lost/10 px-3 py-1 text-xs font-medium text-lost">{t}</span>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Per-topic breakdown">
              <div className="flex flex-col gap-3">
                {Object.entries(result.perTopic).map(([id, b]) => {
                  const c = ringColor(b.score);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-sm text-ink">{b.title}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${b.score}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}80` }} />
                      </div>
                      <span className="mono w-10 text-right text-sm font-semibold" style={{ color: c }}>{b.score}%</span>
                      <span className="mono w-10 text-right text-xs text-faint">{b.correct}/{b.total}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={reset}><RotateCcw size={15} /> New quiz</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Quiz;
