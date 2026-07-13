import { apiFetch } from "./client";

const serialize = (q) => ({
  id: q.id,
  date: q.date,
  mode: q.mode ?? null,
  difficulty: q.difficulty ?? null,
  score: Number(q.score) || 0,
  total: Number(q.total) || 0,
  correct: Number(q.correct) || 0,
});

// Quiz history is append-only; the UI's slice(0,50) is a display trim only, so
// the hook runs allowDelete:false (older attempts stay on the server).
export const quizHistoryApi = {
  list: () => apiFetch("/quiz-history"),
  create: (attempt) =>
    apiFetch("/quiz-history", { method: "POST", body: JSON.stringify(serialize(attempt)) }),
};
