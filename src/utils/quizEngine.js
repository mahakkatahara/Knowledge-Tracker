/**
 * quizEngine.js
 *
 * Builds a quiz from the topics the user is already tracking, scores it, and
 * feeds the result straight back into the decay model (decayEngine.js).
 *
 * Two generation modes:
 *   1. AI mode      — if a Gemini API key is present, real MCQs are generated
 *                     for each topic at the chosen difficulty.
 *   2. Self-check   — no key? We fall back to a metacognitive recall test
 *                     (you rate how well you can answer). Still produces a
 *                     per-topic score, so the "weak topics -> High risk" loop
 *                     works exactly the same.
 *
 * Whatever the mode, every question is tagged with its source topicId, so after
 * submitting we know each topic's score and can push the weak ones up the risk
 * ladder by rewriting their quizScore / confidence in the tracker.
 */

const GEMINI_URL = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

// Tried in order. If one is overloaded/unavailable, we fall through to the next.
const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Transient errors worth retrying: overloaded (503), rate-limited (429), demand spikes.
const isRetryable = (status, msg = "") => {
  if (status === 503 || status === 429 || status === 500) return true;
  const m = msg.toLowerCase();
  return m.includes("overload") || m.includes("high demand") || m.includes("unavailable") || m.includes("try again");
};

// Read the key from Vite env (VITE_GEMINI_API_KEY). Empty string => no key.
export const getGeminiKey = () =>
  (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || "";

export const hasAiKey = () => getGeminiKey().trim().length > 0;

/**
 * Decide how many questions each topic gets so the total ~= `count`.
 * Spreads questions evenly; if topics > count, a random subset is quizzed.
 * Returns: [{ topic, n }]
 */
export function planQuiz(topics, count) {
  if (!topics || topics.length === 0) return [];
  const shuffled = [...topics].sort(() => Math.random() - 0.5);

  if (shuffled.length >= count) {
    // One question each for `count` randomly chosen topics.
    return shuffled.slice(0, count).map((topic) => ({ topic, n: 1 }));
  }

  // Fewer topics than questions: give everyone a base share, distribute remainder.
  const base = Math.floor(count / shuffled.length);
  let remainder = count % shuffled.length;
  return shuffled.map((topic) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { topic, n: base + extra };
  });
}

/**
 * One raw call to a specific Gemini model. Returns the model's text, or throws
 * an Error tagged with `.retryable` so the caller knows whether to back off.
 */
async function callGeminiModel(prompt, model, key) {
  let res;
  try {
    res = await fetch(GEMINI_URL(model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });
  } catch (networkErr) {
    // Network blip — worth a retry.
    const e = new Error(networkErr.message || "Network error");
    e.retryable = true;
    throw e;
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `Gemini request failed (${res.status})`;
    const e = new Error(msg);
    e.retryable = isRetryable(res.status, msg);
    throw e;
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * AI generation via Gemini, with retry + model fallback.
 * Tries each model in GEMINI_MODELS; for each, retries transient overloads with
 * exponential backoff. Only gives up (throws) once everything is exhausted.
 */
async function generateWithGemini(plan, difficulty, key) {
  const topicSpec = plan
    .map((p) => `- "${p.topic.title}" (${p.n} question${p.n > 1 ? "s" : ""})`)
    .join("\n");

  const diffLine =
    difficulty === "Mixed"
      ? "Vary difficulty across Easy, Medium and Hard."
      : `Every question must be ${difficulty} difficulty.`;

  const prompt =
    `You are an exam question writer. Create multiple-choice questions for a student's revision quiz.\n\n` +
    `Topics and how many questions each:\n${topicSpec}\n\n` +
    `${diffLine}\n` +
    `Rules:\n` +
    `- Each question has exactly 4 options.\n` +
    `- Exactly one option is correct.\n` +
    `- Options must be plausible; avoid "all/none of the above".\n` +
    `- Keep questions self-contained and factual.\n\n` +
    `Return ONLY a JSON array (no markdown, no commentary) where each element is:\n` +
    `{"topic": "<exact topic title>", "difficulty": "Easy|Medium|Hard", "question": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "one short sentence"}`;

  const MAX_ATTEMPTS_PER_MODEL = 3;
  let lastErr = new Error("AI generation failed.");

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const raw = await callGeminiModel(prompt, model, key);
        return parseGeminiQuestions(raw, plan, difficulty);
      } catch (e) {
        lastErr = e;
        // Non-retryable (bad key, bad request) → stop trying this model entirely.
        if (!e.retryable) break;
        // Retryable → back off (0.8s, 1.6s) before the next attempt.
        if (attempt < MAX_ATTEMPTS_PER_MODEL) await sleep(800 * attempt);
      }
    }
    // Move on to the next model in the fallback list.
  }
  throw lastErr;
}

/**
 * Parse the model's JSON text into our question objects.
 */
function parseGeminiQuestions(raw, plan, difficulty) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last resort: grab the first [...] block.
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("AI returned an unparseable response.");
    parsed = JSON.parse(m[0]);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI returned no questions.");
  }

  // Map back to our shape + attach topicId by matching the title.
  const byTitle = new Map(plan.map((p) => [p.topic.title.toLowerCase(), p.topic]));
  return parsed
    .map((q, i) => {
      const topic = byTitle.get(String(q.topic || "").toLowerCase());
      const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
      if (!topic || opts.length !== 4) return null;
      let correctIndex = Number(q.correctIndex);
      if (!(correctIndex >= 0 && correctIndex <= 3)) correctIndex = 0;
      return {
        id: `q-${Date.now()}-${i}`,
        type: "mcq",
        topicId: topic.id,
        topicTitle: topic.title,
        difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty)
          ? q.difficulty
          : difficulty === "Mixed"
          ? "Medium"
          : difficulty,
        question: String(q.question || "").trim(),
        options: opts.map((o) => String(o)),
        correctIndex,
        explanation: String(q.explanation || "").trim(),
      };
    })
    .filter(Boolean);
}

/**
 * Offline fallback: one metacognitive self-check per question slot.
 * The 4 options map to a known-ness score; option 0 = fully known.
 */
function generateSelfCheck(plan, difficulty) {
  const items = [];
  plan.forEach((p) => {
    for (let i = 0; i < p.n; i++) {
      const diff =
        difficulty === "Mixed"
          ? ["Easy", "Medium", "Hard"][i % 3]
          : difficulty;
      items.push({
        id: `sc-${Date.now()}-${p.topic.id}-${i}`,
        type: "selfcheck",
        topicId: p.topic.id,
        topicTitle: p.topic.title,
        difficulty: diff,
        question: `Without looking anything up — how well could you answer a ${diff.toLowerCase()} question on "${p.topic.title}"?`,
        options: [
          "I can explain it fully and handle hard questions",
          "I know the basics but I'm fuzzy on details",
          "Only vaguely familiar",
          "I'd struggle — can't really recall it",
        ],
        // Mapped to a score so we can grade self-honesty consistently.
        optionScores: [100, 67, 33, 0],
        correctIndex: 0, // "fully known" is the goal state
        explanation: "Be honest — fuzzy recall today means high forget-risk.",
      });
    }
  });
  return items;
}

/**
 * Public entry point. Always resolves to { items, mode, error? }.
 * Never throws — on AI failure it falls back to self-check so the page works.
 */
export async function buildQuiz({ topics, count = 5, difficulty = "Mixed" }) {
  const plan = planQuiz(topics, count);
  if (plan.length === 0) return { items: [], mode: "none" };

  const key = getGeminiKey().trim();
  if (key) {
    try {
      const items = await generateWithGemini(plan, difficulty, key);
      if (items.length > 0) return { items, mode: "ai" };
      throw new Error("No usable questions returned.");
    } catch (e) {
      const overloaded = isRetryable(0, e.message);
      const error = overloaded
        ? "Gemini is overloaded right now (high demand). Showing self-check questions — tap “Try AI again” in a moment."
        : `AI generation failed (${e.message}). Showing self-check questions instead.`;
      return {
        items: generateSelfCheck(plan, difficulty),
        mode: "selfcheck",
        error,
        canRetryAi: true,
      };
    }
  }
  return { items: generateSelfCheck(plan, difficulty), mode: "selfcheck" };
}

/**
 * Grade answers and return per-topic scores.
 * answers: { [questionId]: selectedIndex }
 * Returns { perTopic: { [topicId]: { title, correct, total, score } }, totalCorrect, totalQuestions }
 */
export function gradeQuiz(items, answers) {
  const perTopic = {};
  let totalCorrect = 0;

  items.forEach((q) => {
    const sel = answers[q.id];
    const bucket =
      perTopic[q.topicId] ||
      (perTopic[q.topicId] = { title: q.topicTitle, correct: 0, total: 0, points: 0 });
    bucket.total += 1;

    if (q.type === "mcq") {
      const ok = sel === q.correctIndex;
      if (ok) {
        bucket.correct += 1;
        bucket.points += 100;
        totalCorrect += 1;
      }
    } else {
      // self-check: award the mapped known-ness score; "fully known" counts as correct.
      const pts = typeof sel === "number" ? q.optionScores[sel] ?? 0 : 0;
      bucket.points += pts;
      if (sel === 0) {
        bucket.correct += 1;
        totalCorrect += 1;
      }
    }
  });

  Object.values(perTopic).forEach((b) => {
    b.score = Math.round(b.points / b.total); // 0–100 per topic
  });

  return { perTopic, totalCorrect, totalQuestions: items.length };
}

/**
 * Map a 0–100 quiz score to a 1–5 confidence value. Deliberately a little
 * harsh on the low end so a genuinely weak score lands in High risk via the
 * decay engine (retention <= 40 => High).
 */
function scoreToConfidence(score) {
  if (score >= 80) return 5;
  if (score >= 65) return 4;
  if (score >= 50) return 3;
  if (score >= 35) return 2;
  return 1;
}

/**
 * Rewrite each quizzed topic's quizScore + confidence from the result and reset
 * lastStudied to today (you just engaged with it). Risk is then recomputed by
 * the existing decayEngine — no separate "forced" flag, single source of truth.
 *
 * Returns { updatedTopics, movedToHigh: [titles] } using calculateRetention/
 * getForgetRisk passed in to avoid a circular import.
 */
export function applyQuizResults(topics, gradeResult, decay) {
  const { perTopic } = gradeResult;
  const today = new Date().toISOString().split("T")[0];
  const movedToHigh = [];

  const updatedTopics = topics.map((t) => {
    const r = perTopic[t.id];
    if (!r) return t; // topic wasn't in this quiz

    const updated = {
      ...t,
      quizScore: r.score,
      confidenceScore: scoreToConfidence(r.score),
      lastStudied: today,
      lastQuizScore: r.score,
      lastQuizedAt: today,
    };

    // Was it not High before, but High now?
    const beforeRisk = decay.getForgetRisk(decay.calculateRetention(t)).category;
    const afterRisk = decay.getForgetRisk(decay.calculateRetention(updated)).category;
    if (afterRisk === "High" && beforeRisk !== "High") movedToHigh.push(t.title);

    return updated;
  });

  return { updatedTopics, movedToHigh };
}
