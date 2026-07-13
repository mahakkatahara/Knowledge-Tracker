import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useServerCollection — a drop-in replacement for useLocalStorage for arrays of
 * `{ id, ... }` records that must live in the backend (Turso) instead of only
 * in the browser.
 *
 * It keeps the exact `[items, setItems]` shape useLocalStorage returned, so page
 * components barely change. Behaviour:
 *
 *  1. Instant paint from a localStorage cache (same key), so the UI never blanks
 *     while the network request is in flight, and still works offline.
 *  2. On mount (and whenever `cacheKey`/`enabled` changes) it GETs the real
 *     collection from the server and reconciles.
 *  3. Every `setItems(...)` (value or updater) diffs the new array against the
 *     last state known to be on the server and fires the right create / update /
 *     delete calls in the background. Failures are logged, never thrown — the
 *     cache keeps the UI responsive and the next load re-syncs the truth.
 *
 * @param {string}  cacheKey     localStorage key (usually namespaced by user)
 * @param {Array}   initialValue fallback when nothing is cached
 * @param {Object}  api          { list, create, update?, remove? } (see api/*.js)
 * @param {Object}  [options]
 * @param {boolean} [options.enabled=true]     when false (e.g. logged-out guest)
 *                                             behaves like plain localStorage
 * @param {boolean} [options.allowDelete=true] set false for append-only
 *                                             collections (sessions, quiz history)
 */
export default function useServerCollection(cacheKey, initialValue, api, options = {}) {
  const { enabled = true, allowDelete = true } = options;

  const readCache = (key) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  };

  const writeCache = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`useServerCollection: cache write failed for "${key}"`, e);
    }
  };

  const [items, setItemsState] = useState(() => readCache(cacheKey));

  // Last array we know matches the server. null = not loaded yet (so we never
  // mass-delete against an unknown baseline).
  const serverRef = useRef(null);
  // Holds the { prev, next } of a user mutation until the post-commit effect
  // can persist it (kept out of the state updater so React StrictMode's
  // double-invoke can't double-fire network calls).
  const pendingRef = useRef(null);

  // Key changed at runtime (different user logged in): re-read the new key's
  // cache synchronously so we never flash the previous user's rows. This is the
  // sanctioned "adjust state when a prop changes" pattern (state, not refs, so
  // it's safe during render); ref/baseline resets happen in the load effect.
  const [prevKey, setPrevKey] = useState(cacheKey);
  if (prevKey !== cacheKey) {
    setPrevKey(cacheKey);
    setItemsState(readCache(cacheKey));
  }

  // ── Initial / key-change load from the server ──────────────────────────────
  useEffect(() => {
    // Reset baselines for the new key before (re)loading.
    serverRef.current = null;
    pendingRef.current = null;
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.list();
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        serverRef.current = arr;
        setItemsState(arr);
        writeCache(cacheKey, arr);
      } catch (e) {
        // Offline or auth hiccup — keep the cached view and leave serverRef null
        // so a later mutation only syncs its own delta, not a full re-create.
        console.error(`useServerCollection: load failed for "${cacheKey}"`, e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  // ── Persist user mutations after they commit ───────────────────────────────
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;

    writeCache(cacheKey, pending.next);
    if (!enabled) return;

    // Baseline: what the server currently holds. Before the first successful
    // load, fall back to the pre-mutation array so we only push the delta.
    const baseline = serverRef.current !== null ? serverRef.current : pending.prev;
    reconcile(baseline, pending.next, api, allowDelete);
    serverRef.current = pending.next; // optimistic; next load corrects any drift
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const setItems = useCallback((updater) => {
    setItemsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      pendingRef.current = { prev, next };
      return next;
    });
  }, []);

  return [items, setItems];
}

/** Diff two id-keyed arrays and fire the matching API calls (never throws). */
function reconcile(baseline, next, api, allowDelete) {
  const baseById = new Map((baseline || []).map((i) => [i.id, i]));
  const nextIds = new Set((next || []).map((i) => i.id));
  const calls = [];

  for (const item of next || []) {
    const old = baseById.get(item.id);
    if (!old) {
      calls.push(safe(() => api.create(item), "create", item.id));
    } else if (api.update && !shallowEqualRecord(old, item)) {
      calls.push(safe(() => api.update(item.id, item), "update", item.id));
    }
  }

  if (allowDelete && api.remove) {
    for (const item of baseline || []) {
      if (!nextIds.has(item.id)) {
        calls.push(safe(() => api.remove(item.id), "delete", item.id));
      }
    }
  }

  return Promise.allSettled(calls);
}

const safe = (fn, label, id) =>
  Promise.resolve()
    .then(fn)
    .catch((e) => console.error(`useServerCollection: ${label} failed for "${id}"`, e));

// Compare only fields both records share, so server-only extras (userId,
// createdAt) don't count as "changed" and trigger needless PUTs.
function shallowEqualRecord(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === "userId" || k === "createdAt") continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
}
