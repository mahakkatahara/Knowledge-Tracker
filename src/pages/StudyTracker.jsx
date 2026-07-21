import { useState, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, BookOpen, Star, Award, Clock, Brain, UploadCloud, FileText, Loader, AlertCircle, PlayCircle, Globe, GraduationCap, Sparkles } from "lucide-react";
import useServerCollection from "../hooks/useServerCollection";
import { topicsApi } from "../api/topics";
import { sessionsApi } from "../api/sessions";
import { INITIAL_TOPICS } from "../utils/mockData";
import Card from "../components/Card";
import Button from "../components/Button";
import { calculateRetention, getForgetRisk } from "../utils/decayEngine";
import { extractTopicsFromPdf } from "../utils/pdfExtractor";
import { refineTopics, canRefineWithAi } from "../utils/topicRefiner";
import { makeSession } from "../utils/sessionLog";
import { AuthContext } from "../context/AuthContext";
import { Reveal } from "../components/ui/Reveal";
import RiskBadge from "../components/ui/RiskBadge";
import StudyMascot from "../components/visual/StudyMascot";
import { retentionColor, riskOf } from "../lib/risk";

const StudyTracker = () => {
  const { user } = useContext(AuthContext);
  const uid = user?.email || "guest";
  const enabled = !!user?.token;
  const [topics, setTopics] = useServerCollection(`kt_topics::${uid}`, INITIAL_TOPICS, topicsApi, { enabled });
  // Append-only log of real study sessions (date + minutes) — the actual
  // source of truth for the Dashboard's weekly hours / streak, so revising
  // a topic doesn't silently re-donate its original duration to today.
  const [, setSessions] = useServerCollection(`kt_sessions::${uid}`, [], sessionsApi, { enabled, allowDelete: false });

  const studyLinks = (title) => {
    const t = encodeURIComponent(title.trim());
    return {
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(title.trim() + " tutorial lecture")}`,
      articles: `https://www.google.com/search?safe=active&q=${encodeURIComponent(title.trim() + " explained tutorial")}`,
      wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${t}`,
    };
  };

  // Normalises a title so near-identical topics ("Binary Trees" / "binary tree")
  // collapse to the same key — used to avoid adding duplicate topics.
  const normalizeTitle = (title) =>
    (title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
      .sort()
      .join(" ");

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [duration, setDuration] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(3);

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pendingTopics, setPendingTopics] = useState([]);
  const [pendingFile, setPendingFile] = useState("");
  // How many topics the user wants pulled from the PDF (was hard-coded to 8).
  const [topicCount, setTopicCount] = useState(8);
  // Whether the last extraction was AI-verified (Gemini) or local-only.
  const [aiVerified, setAiVerified] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setUploadError("");
    setPendingTopics([]);
    setPendingFile("");

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please choose a .pdf file.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setAiVerified(false);
    try {
      // Over-extract locally so the AI verifier has a rich pool to filter/rank
      // (and so a no-key fallback still has enough to fill `topicCount`).
      const candidateCap = Math.min(60, Math.max(topicCount * 3, topicCount + 10));
      const { topics: rawCandidates, pageText } = await extractTopicsFromPdf(file, {
        maxTopics: candidateCap,
        // Ensure the topicCount topics actually kept (by the AI verifier or the
        // no-key slice fallback) are spread across the ENTIRE PDF, not clustered
        // in the first few pages.
        finalCount: topicCount,
      });

      if (!rawCandidates || rawCandidates.length === 0) {
        setUploadError(
          "Couldn't find readable text/topics in that PDF. Scanned image-only PDFs aren't supported (no embedded text)."
        );
        return;
      }

      // Second pass: Gemini keeps only real topics (drops lines / table rows /
      // instructions), fixes wording, trims to topicCount. Falls back to the
      // local list if there's no API key or the AI call fails.
      const { topics: extracted, usedAi } = await refineTopics(
        rawCandidates,
        pageText,
        topicCount
      );
      setAiVerified(usedAi);

      if (!extracted || extracted.length === 0) {
        setUploadError("Couldn't extract usable topics from that PDF.");
        return;
      }

      // Skip anything that already exists in the tracker, or repeats within this
      // same extraction, so the review list never shows duplicates.
      const existingKeys = new Set(topics.map((t) => normalizeTitle(t.title)));
      const seen = new Set();
      const unique = extracted.filter((t) => {
        const key = normalizeTitle(t.title);
        if (!key || existingKeys.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length === 0) {
        setUploadError(
          "Every topic found in that PDF is already in your tracker — nothing new to add."
        );
        return;
      }

      setPendingTopics(
        unique.map((t) => ({
          id: t.id,
          title: t.title,
          difficulty: t.difficulty,
          duration: 30,
          confidenceScore: 3,
        }))
      );
      setPendingFile(file.name);
    } catch (err) {
      console.error("PDF extraction failed:", err);
      setUploadError("Failed to read the PDF: " + (err?.message || "unknown error"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const updatePending = (id, field, value) => {
    setPendingTopics((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const commitPendingTopics = () => {
    const today = new Date().toISOString().split("T")[0];
    const existingKeys = new Set(topics.map((t) => normalizeTitle(t.title)));
    const seen = new Set();
    const built = pendingTopics
      .filter((p) => {
        const key = normalizeTitle(p.title);
        if (!key || existingKeys.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p, i) => ({
        id: `pdf-${Date.now()}-${i}`,
        title: p.title.trim() || "Untitled topic",
        lastStudied: today,
        duration: parseInt(p.duration) || 30,
        confidenceScore: parseInt(p.confidenceScore) || 3,
        quizScore: 100,
        revisionCount: 0,
        difficulty: p.difficulty,
        source: "pdf",
        sourceFile: pendingFile,
      }));

    if (built.length === 0) {
      alert("These topics are already in your tracker — nothing new to add.");
      setPendingTopics([]);
      setPendingFile("");
      return;
    }
    setTopics((prev) => [...built, ...prev]);
    setSessions((prev) => [
      ...built.map((t) => makeSession(t.id, t.duration, t.lastStudied)),
      ...prev,
    ]);
    setPendingTopics([]);
    setPendingFile("");
  };

  const cancelPending = () => {
    setPendingTopics([]);
    setPendingFile("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !duration) {
      alert("Please fill out all fields before logging.");
      return;
    }

    const dupKey = normalizeTitle(title);
    if (topics.some((t) => normalizeTitle(t.title) === dupKey)) {
      alert(`"${title.trim()}" is already in your tracker.`);
      return;
    }

    const newTopic = {
      id: `topic-${Date.now()}`,
      title: title.trim(),
      lastStudied: new Date().toISOString().split("T")[0],
      duration: parseInt(duration),
      confidenceScore: parseInt(confidenceScore),
      quizScore: 100,
      revisionCount: 0,
      difficulty,
    };

    setTopics([newTopic, ...topics]);
    setSessions((prev) => [makeSession(newTopic.id, newTopic.duration, newTopic.lastStudied), ...prev]);

    setTitle("");
    setDifficulty("Medium");
    setDuration("");
    setConfidenceScore(3);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this study topic?")) {
      setTopics(topics.filter((topic) => topic.id !== id));
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm("Are you sure you want to delete ALL study topics? This action cannot be undone.")) {
      setTopics([]);
    }
  };

  const incrementRevision = (id) => {
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;

    // Ask how long this revision actually took instead of silently
    // re-attributing the topic's original creation-time duration to today —
    // that was making the weekly hours chart show inflated/wrong numbers.
    const input = window.prompt(
      `How many minutes did you spend revising "${topic.title}" just now?`,
      "15"
    );
    if (input === null) return; // cancelled — don't log a phantom session
    const minutes = Math.max(0, parseInt(input) || 0);
    const today = new Date().toISOString().split("T")[0];

    setTopics(
      topics.map((t) =>
        t.id === id
          ? { ...t, revisionCount: t.revisionCount + 1, lastStudied: today }
          : t
      )
    );
    setSessions((prev) => [makeSession(id, minutes, today), ...prev]);
  };

  const decrementRevision = (id) => {
    setTopics(
      topics.map((topic) => {
        if (topic.id === id) {
          return { ...topic, revisionCount: Math.max(0, topic.revisionCount - 1) };
        }
        return topic;
      })
    );
  };

  // ── styling helpers ──
  const fieldCls =
    "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-synapse/60 focus:ring-2 focus:ring-synapse/25";
  const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint mono";
  const diffTone = { Easy: "text-retained", Medium: "text-decaying", Hard: "text-lost" };

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <span className="eyebrow">Capture</span>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Study tracker</h1>
        <p className="mt-2 text-muted">Log your study parameters to update knowledge-decay estimates.</p>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* ── Left: inputs ── */}
        <div className="flex flex-col gap-6">
          {/* PDF upload */}
          <Reveal>
            <Card title="Upload PDF — auto-extract topics">
              <p className="mb-4 text-sm leading-relaxed text-muted">
                Drop your study notes as a PDF. The app reads the whole document and pulls
                out the key topics — you enter quiz score & confidence, and the forget-risk
                is computed for you.
              </p>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label htmlFor="topic-count" className="text-sm text-muted">
                  Topics to extract:
                </label>
                <select
                  id="topic-count"
                  value={topicCount}
                  onChange={(e) => setTopicCount(Number(e.target.value))}
                  disabled={uploading}
                  className={fieldCls + " w-auto"}
                >
                  {[5, 8, 10, 15, 20, 30, 40].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span
                  className={
                    "flex items-center gap-1 rounded-full border px-2 py-1 text-xs " +
                    (canRefineWithAi()
                      ? "border-synapse/40 bg-synapse/[0.08] text-synapse-bright"
                      : "border-line bg-surface-2 text-faint")
                  }
                  title={
                    canRefineWithAi()
                      ? "Extracted topics are verified & cleaned by AI (Gemini)."
                      : "Add a Gemini API key (VITE_GEMINI_API_KEY) to enable AI verification."
                  }
                >
                  <Sparkles size={12} />
                  {canRefineWithAi() ? "AI verification on" : "AI verification off"}
                </span>
              </div>

              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} className="hidden" />

              <button
                type="button"
                onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                className="group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-sm text-muted transition hover:border-synapse/50 hover:bg-synapse/[0.05] disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader size={24} className="animate-spin text-signal" />
                    <span>Reading PDF & extracting topics…</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-2 transition group-hover:scale-110">
                      <UploadCloud size={22} className="text-signal" />
                    </span>
                    <span className="font-medium text-ink">Click to choose a PDF file</span>
                    <span className="text-xs text-faint">Text-based PDFs only</span>
                  </>
                )}
              </button>

              {uploadError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-lost/30 bg-lost/10 px-3 py-2.5 text-xs text-lost">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> <span>{uploadError}</span>
                </div>
              )}

              <AnimatePresence>
                {pendingTopics.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="flex items-start gap-2 rounded-xl border border-signal/25 bg-signal/[0.06] px-3 py-2.5 text-xs text-muted">
                      <FileText size={14} className="mt-0.5 shrink-0 text-signal" />
                      <span>
                        Found <strong className="text-ink">{pendingTopics.length}</strong> topics in{" "}
                        <em className="text-signal">{pendingFile}</em>
                        {aiVerified ? (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-synapse/40 bg-synapse/[0.1] px-1.5 py-0.5 text-[10px] text-synapse-bright">
                            <Sparkles size={10} /> AI-verified
                          </span>
                        ) : null}
                        . Enter your quiz score & confidence — the app computes the forget-risk
                        automatically.
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2.5">
                      {pendingTopics.map((p, idx) => (
                        <div key={p.id} className="rounded-2xl border border-line bg-surface-2 p-3">
                          <div className="mb-2.5 flex items-center gap-2">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-synapse/15 text-[11px] font-semibold text-synapse-bright mono">{idx + 1}</span>
                            <input
                              className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-synapse/60"
                              value={p.title}
                              onChange={(e) => updatePending(p.id, "title", e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <select value={p.difficulty} onChange={(e) => updatePending(p.id, "difficulty", e.target.value)} className={fieldCls} title="Difficulty">
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                            </select>
                            <input type="number" min="1" placeholder="Min" value={p.duration} onChange={(e) => updatePending(p.id, "duration", e.target.value)} className={fieldCls} title="Minutes studied" />
                            <select value={p.confidenceScore} onChange={(e) => updatePending(p.id, "confidenceScore", e.target.value)} className={fieldCls} title="Confidence (1–5)">
                              <option value="1">Conf 1</option>
                              <option value="2">Conf 2</option>
                              <option value="3">Conf 3</option>
                              <option value="4">Conf 4</option>
                              <option value="5">Conf 5</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={cancelPending}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={commitPendingTopics}>
                        <Plus size={14} /> Add {pendingTopics.length} topics
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </Reveal>

          {/* Manual log */}
          <Reveal>
            <Card title="Log new study session">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="topic-title" className={labelCls}>Topic title</label>
                  <input id="topic-title" type="text" placeholder="e.g., Dynamic Programming, Trees" value={title} onChange={(e) => setTitle(e.target.value)} required className={fieldCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="difficulty" className={labelCls}>Difficulty</label>
                    <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={fieldCls}>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="duration" className={labelCls}>Duration (min)</label>
                    <input id="duration" type="number" placeholder="e.g., 60" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" required className={fieldCls} />
                  </div>
                </div>
                <div>
                  <label htmlFor="confidence" className={labelCls}>Confidence (1-5)</label>
                  <select id="confidence" value={confidenceScore} onChange={(e) => setConfidenceScore(parseInt(e.target.value))} className={fieldCls}>
                    <option value="1">1 - Very Low</option>
                    <option value="2">2 - Low</option>
                    <option value="3">3 - Medium</option>
                    <option value="4">4 - High</option>
                    <option value="5">5 - Excellent</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" className="mt-1 w-full">
                  <Plus size={16} /> Log activity
                </Button>
              </form>
            </Card>
          </Reveal>
        </div>

        {/* ── Right: catalog ── */}
        <div className="flex flex-col gap-6">
          <Reveal>
            <Card
              title="Active learning catalog"
              actions={
                topics.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-line text-muted hover:text-lost hover:border-lost/30"
                    onClick={handleDeleteAll}
                  >
                    <Trash2 size={12} /> Delete all
                  </Button>
                )
              }
            >
            {topics.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface-2">
                  <BookOpen size={30} className="text-faint" />
                </span>
                <p className="max-w-xs text-sm text-muted">No study logs yet. Use the form or upload a PDF to start tracking your retention.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {topics.map((topic, index) => {
                  const retention = calculateRetention(topic);
                  const riskObj = getForgetRisk(retention);
                  const risk = riskObj.category;
                  const tone = riskOf(risk);
                  return (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
                      className="rounded-2xl border bg-surface-2 p-4 transition-colors hover:bg-surface-2"
                      style={{ borderColor: tone.border }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs font-semibold text-muted mono">{index + 1}</span>
                          <div>
                            <h4 className="font-medium text-ink">{topic.title}</h4>
                            <span className={`mono text-[11px] font-medium ${diffTone[topic.difficulty] || "text-muted"}`}>{topic.difficulty}</span>
                          </div>
                        </div>
                        <RiskBadge risk={risk} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { icon: Clock, label: `${topic.duration} min` },
                          { icon: Star, label: `Conf ${topic.confidenceScore}/5` },
                          { icon: Award, label: `Quiz ${topic.quizScore}%` },
                          { icon: Brain, label: `Ret ${retention}%`, accent: true },
                        ].map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-muted">
                            <d.icon size={13} style={{ color: d.accent ? retentionColor(retention) : undefined }} />
                            <span style={{ color: d.accent ? retentionColor(retention) : undefined }} className={d.accent ? "font-semibold" : ""}>{d.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-faint"><GraduationCap size={13} /> Study:</span>
                        <a href={studyLinks(topic.title).youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-2 py-1 text-muted transition hover:border-line-strong hover:bg-surface-2 hover:text-ink">
                          <PlayCircle size={13} className="text-faint" /> YouTube
                        </a>
                        <a href={studyLinks(topic.title).articles} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-2 py-1 text-muted transition hover:border-line-strong hover:bg-surface-2 hover:text-ink">
                          <Globe size={13} className="text-faint" /> Articles
                        </a>
                        <a href={studyLinks(topic.title).wikipedia} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-2 py-1 text-muted transition hover:border-line-strong hover:bg-surface-2 hover:text-ink">
                          <BookOpen size={13} className="text-faint" /> Wikipedia
                        </a>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                        <div className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5">
                          <span className="text-xs text-muted">Revisions: <span className="font-semibold text-ink">{topic.revisionCount}</span></span>
                          <button onClick={() => decrementRevision(topic.id)} title="Decrease revisions" className="grid h-6 w-6 place-items-center rounded-md bg-surface-2 text-muted transition hover:bg-emerald-100 hover:text-ink">−</button>
                          <button onClick={() => incrementRevision(topic.id)} title="Mark as revised today" className="grid h-6 w-6 place-items-center rounded-md bg-synapse/20 text-synapse-bright transition hover:bg-synapse/30">+</button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-faint">Last studied: {topic.lastStudied}</span>
                          <button onClick={() => handleDelete(topic.id)} title="Delete topic" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-faint transition hover:border-lost/40 hover:bg-lost/10 hover:text-lost">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
          </Reveal>

          {/* mascot fills the empty space at the bottom of the right column */}
          <div className="mt-auto hidden flex-col items-center pt-4 lg:flex">
            <div className="relative z-10 mb-[-3.25rem] max-w-[15rem] rounded-2xl bg-white px-4 py-2.5 text-center shadow-lg ring-1 ring-black/5">
              <p className="text-[13px] font-semibold leading-snug text-slate-700">
                {user
                  ? `Nice, ${(user.name || "there").split(" ")[0]} — log your next session!`
                  : "Log a session — I'll track the decay"}
              </p>
              <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
            </div>
            <StudyMascot className="h-72 w-auto drop-shadow-xl xl:h-80" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyTracker;
