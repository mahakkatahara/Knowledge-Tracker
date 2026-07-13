import { apiFetch } from "./client";

// Map a frontend topic object to the payload the backend expects. Client-only
// fields (source, sourceFile) are dropped; the backend ignores what it doesn't
// model. camelCase keys are accepted server-side via alias validation.
const serialize = (t) => ({
  id: t.id,
  title: t.title,
  difficulty: t.difficulty || "Medium",
  duration: Number(t.duration) || 0,
  confidenceScore: Number(t.confidenceScore) || 0,
  quizScore: Number(t.quizScore) || 0,
  revisionCount: Number(t.revisionCount) || 0,
  lastStudied: t.lastStudied,
  documentId: t.documentId ?? null,
  noteId: t.noteId ?? null,
});

export const topicsApi = {
  list: () => apiFetch("/topics"),
  create: (topic) =>
    apiFetch("/topics", { method: "POST", body: JSON.stringify(serialize(topic)) }),
  update: (id, topic) =>
    apiFetch(`/topics/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(serialize(topic)),
    }),
  remove: (id) =>
    apiFetch(`/topics/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
