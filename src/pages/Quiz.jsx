import { useState, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Loader, CheckCircle2, XCircle, AlertTriangle, TrendingUp, RotateCcw, PlayCircle, Info, ChevronLeft, ChevronRight, Flag, Lightbulb } from "lucide-react";
import useLocalStorage from "../hooks/useLocalStorage";
import { INITIAL_TOPICS } from "../utils/mockData";
import Card from "../components/Card";
import Button from "../components/Button";
import { AuthContext } from "../context/AuthContext";
import { calculateRetention, getForgetRisk } from "../utils/decayEngine";
import { buildQuiz, gradeQuiz, applyQuizResults, hasAiKey, callGeminiText } from "../utils/quizEngine";
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
  const [current, setCurrent] = useState(0);      // one-question-at-a-time index
  const [result, setResult] = useState(null);
  const [moved, setMoved] = useState([]);
  const [explains, setExplains] = useState({});   // { [qId]: { loading, text, error } }

  const aiOn = useMemo(() => hasAiKey(), []);

  const startQuiz = async () => {
    if (topics.length === 0) return;
    setStage(STAGE.LOADING);
    setGenError("");
    setAnswers({});
    setCurrent(0);
    setExplains({});
    const { items: qs, mode: m, error, canRetryAi: retry } = await buildQuiz({ topics, count, difficulty });
    setItems(qs);
    setMode(m);
    setCanRetryAi(!!retry);
    setGenError(error || "");
    setStage(STAGE.QUIZ);
  };

  const selectAnswer = (qId, idx) => setAnswers((prev) => ({ ...prev, [qId]: idx }));
  const answeredCount = Object.keys(answers).length;

  const goPrev = () => setCurrent((c) => Math.max(0, c - 1));
  const goNext = () => setCurrent((c) => Math.min(items.length - 1, c + 1));

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
    setCurrent(0);
    setResult(null);
    setMoved([]);
    setGenError("");
    setExplains({});
  };

  // Deeper, on-demand AI explanation for a single question.
  const explainWithAI = async (q) => {
    setExplains((p) => ({ ...p, [q.id]: { loading: true } }));
    try {
      const optLines = q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n");
      const prompt =
        `You are a helpful tutor. A student answered a quiz question.\n\n` +
        `Question: ${q.question}\n${optLines}\n` +
        `Correct answer: ${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}\n\n` +
        `In 2-3 short sentences, explain clearly WHY the correct answer is right, and briefly why the most tempting wrong option is wrong. Plain language, no preamble.`;
      const text = await callGeminiText(prompt);
      setExplains((p) => ({ ...p, [q.id]: { loading: false, text: text.trim() } }));
    } catch (e) {
      setExplains((p) => ({ ...p, [q.id]: { loading: false, error: e.message || "AI request failed." } }));
    }
  };

  // ── styling helpers ──
  const diffTone = (d) =>
    ({ easy: "text-retained", medium: "text-decaying", hard: "text-lost", mixed: "text-signal" }[d.toLowerCase()] || "text-muted");
  const ringColor = (v) => (v >= 70 ? "#10b981" : v >= 40 ? "#f59e0b" : "#ef4444");

  const q = items[current];
  const onLast = current === items.length - 1;

  // Per-question correctness (mcq only; self-check has no right/wrong).
  const isMcq = (it) => it.type === "mcq";
  const correctCount = items.filter((it) => isMcq(it) && answers[it.id] === it.correctIndex).length;
  const mcqTotal = items.filter(isMcq).length;

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Active recall</span>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Auto quiz</h1>
          <p className="mt-2 max-w-xl text-muted">
            Questions generated from your tracked topics. Answer one at a time, then review
            every answer with an AI explanation at the end.
          </p>
        </div>
      </Reveal>

      {/* AI status */}
      <Reveal>
        <div
          className="flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm"
          style={
            aiOn
              ? { borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.07)", color: "#10b981" }
              : { borderColor: "var(--color-line)", background: "var(--color-surface-2)", color: "var(--color-muted)" }
          }
        >
          {aiOn ? <Sparkles size={16} /> : <Info size={16} />}
          {aiOn ? (
            <span>AI question generation & explanations are <strong>ON</strong> (Gemini).</span>
          ) : (
            <span>
              No AI key found — running in <strong>self-check</strong> mode. Add{" "}
              <code className="mono rounded bg-surface-2 px-1.5 py-0.5 text-xs">VITE_GEMINI_API_KEY</code> to your{" "}
              <code className="mono rounded bg-surface-2 px-1.5 py-0.5 text-xs">.env</code> for real MCQs and AI explanations.
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
                  <span className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface-2">
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
                          className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition ${count === n ? "border-synapse/60 bg-synapse/15 text-synapse-bright" : "border-line bg-surface-2 text-muted hover:text-ink"}`}
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
                          className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition ${difficulty === d ? "border-signal/60 bg-signal/15 text-signal" : "border-line bg-surface-2 text-muted hover:text-ink"}`}
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

        {/* QUIZ — one question at a time */}
        {stage === STAGE.QUIZ && q && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <Card>
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

              {/* progress */}
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="mono text-xs text-muted">Question {current + 1} of {items.length}</span>
                  <span className="mono text-xs text-faint">{answeredCount}/{items.length} answered</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#0d9488)]"
                    animate={{ width: `${((current + 1) / items.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-muted">{q.topicTitle}</span>
                    <span className={`mono text-[11px] font-medium ${diffTone(q.difficulty)}`}>{q.difficulty}</span>
                  </div>
                  <p className="mb-4 text-lg font-medium text-ink">{q.question}</p>
                  <div className="grid gap-2.5">
                    {q.options.map((opt, oi) => {
                      const selected = answers[q.id] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => selectAnswer(q.id, oi)}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? "border-synapse/60 bg-synapse/15 text-ink" : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-ink"}`}
                        >
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-semibold mono ${selected ? "bg-synapse text-white" : "bg-emerald-50 text-faint"}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* nav — answering is optional; Next is always available */}
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
                <Button variant="outline" size="sm" onClick={goPrev} disabled={current === 0}>
                  <ChevronLeft size={15} /> Prev
                </Button>
                <span className="mono text-xs text-faint">
                  {answers[q.id] === undefined ? "Not answered — you can skip" : "Answered"}
                </span>
                {onLast ? (
                  <Button variant="primary" size="sm" onClick={submitQuiz}>
                    <Flag size={15} /> Finish & grade
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={goNext}>
                    Next <ChevronRight size={15} />
                  </Button>
                )}
              </div>

              <div className="mt-3 text-center">
                <button className="mono text-xs text-faint underline-offset-2 hover:text-muted hover:underline" onClick={reset}>
                  Cancel quiz
                </button>
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
                  style={{ background: `conic-gradient(${ringColor(result.overall)} ${result.overall * 3.6}deg, #e2e8f0 0deg)` }}
                >
                  <div className="grid h-32 w-32 place-items-center rounded-full bg-surface text-center shadow-inner">
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
                  {mcqTotal > 0 && (
                    <div className="mt-4 flex justify-center gap-2 sm:justify-start">
                      <span className="flex items-center gap-1.5 rounded-full border border-retained/30 bg-retained/10 px-3 py-1 text-xs font-medium text-retained">
                        <CheckCircle2 size={13} /> {correctCount} correct
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full border border-lost/30 bg-lost/10 px-3 py-1 text-xs font-medium text-lost">
                        <XCircle size={13} /> {mcqTotal - correctCount} incorrect
                      </span>
                    </div>
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

            {/* ── Answer review ── */}
            <Card title="Answer review">
              <div className="flex flex-col gap-3">
                {items.map((it, i) => {
                  const mcq = isMcq(it);
                  const sel = answers[it.id];
                  const correct = mcq && sel === it.correctIndex;
                  const ex = explains[it.id];
                  return (
                    <div key={it.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${mcq ? (correct ? "bg-retained/15 text-retained" : "bg-lost/15 text-lost") : "bg-signal/15 text-signal"}`}>
                          {mcq ? (correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />) : <Info size={15} />}
                        </span>
                        <div>
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="mono text-[11px] text-faint">Q{i + 1}</span>
                            <span className="text-xs text-muted">{it.topicTitle}</span>
                            <span className={`mono text-[11px] font-medium ${diffTone(it.difficulty)}`}>{it.difficulty}</span>
                          </div>
                          <p className="text-[15px] font-medium text-ink">{it.question}</p>
                        </div>
                      </div>

                      {/* options with markers */}
                      <div className="grid gap-2">
                        {it.options.map((opt, oi) => {
                          const isCorrect = mcq && oi === it.correctIndex;
                          const isYourWrong = mcq && sel === oi && oi !== it.correctIndex;
                          const isYourPick = sel === oi;
                          let cls = "border-line bg-surface text-muted";
                          if (isCorrect) cls = "border-retained/50 bg-retained/10 text-ink";
                          else if (isYourWrong) cls = "border-lost/50 bg-lost/10 text-ink";
                          else if (!mcq && isYourPick) cls = "border-signal/50 bg-signal/10 text-ink";
                          return (
                            <div key={oi} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${cls}`}>
                              <span className="mono grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-50 text-xs font-semibold text-faint">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <span className="mono text-[10px] font-semibold uppercase text-retained">Correct</span>}
                              {isYourWrong && <span className="mono text-[10px] font-semibold uppercase text-lost">Your pick</span>}
                              {!mcq && isYourPick && <span className="mono text-[10px] font-semibold uppercase text-signal">Your pick</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* AI logic / explanation */}
                      <div className="mt-3 rounded-xl border border-synapse/25 bg-synapse/5 p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <Lightbulb size={14} className="text-synapse-bright" />
                          <span className="mono text-[11px] font-semibold uppercase tracking-wide text-synapse-bright">Why</span>
                        </div>
                        <p className="text-sm text-muted">{ex?.text || it.explanation || "No explanation available."}</p>
                        {ex?.error && <p className="mt-1 text-xs text-lost">{ex.error}</p>}
                        {aiOn && mcq && !ex?.text && (
                          <button
                            onClick={() => explainWithAI(it)}
                            disabled={ex?.loading}
                            className="mt-2 flex items-center gap-1.5 rounded-lg border border-synapse/40 px-2.5 py-1.5 text-xs font-medium text-synapse-bright transition hover:bg-synapse/10 disabled:opacity-60"
                          >
                            {ex?.loading ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            {ex?.loading ? "Thinking…" : "Explain with AI"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Per-topic breakdown">
              <div className="flex flex-col gap-3">
                {Object.entries(result.perTopic).map(([id, b]) => {
                  const c = ringColor(b.score);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-sm text-ink">{b.title}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
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
