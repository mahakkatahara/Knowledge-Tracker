import { apiFetch } from "./client";

const serialize = (s) => ({
  id: s.id,
  date: s.date,
  minutes: Number(s.minutes) || 0,
  topicId: s.topicId ?? null,
});

// Study sessions are append-only from the UI (no edits/deletes), so this client
// only exposes list + create. That is why the hook is configured allowDelete:false.
export const sessionsApi = {
  list: () => apiFetch("/sessions"),
  create: (session) =>
    apiFetch("/sessions", { method: "POST", body: JSON.stringify(serialize(session)) }),
};

