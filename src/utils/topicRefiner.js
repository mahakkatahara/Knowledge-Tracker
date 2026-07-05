/**
 * topicRefiner.js
 *
 * Second pass over the topics produced by pdfExtractor.js.
 *
 * The local extractor is fast and offline, but it can't *understand* the text —
 * so it sometimes promotes a whole line, a table row, or an instruction
 * ("Consistency of Cervix Firm Average Soft", "Start Antihypertensives") into a
 * "topic". This module hands the raw document + the local candidates to Gemini
 * and asks it to keep only the genuine study topics (real concepts / named
 * entities), fix their wording, drop the junk, and add obvious ones the local
 * pass missed — capped to the number the user asked for.
 *
 * It degrades gracefully: no API key, or any AI failure, just returns the local
 * candidates trimmed to `count`. The upload flow never breaks because of AI.
 */

import { hasAiKey, callGeminiText } from "./quizEngine";

// Keep the prompt affordable + within token limits: only send enough of the
// document for the model to judge what's a real topic.
const MAX_CONTEXT_CHARS = 12000;
// Never ship an unbounded candidate list to the model.
const MAX_CANDIDATES_SENT = 60;

/** True if the environment has a Gemini key, so the UI can label the mode. */
export const canRefineWithAi = () => hasAiKey();

/** Strip ```json fences / stray prose the model sometimes wraps around JSON. */
function extractJsonArray(raw) {
  if (!raw) return null;
  let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function buildPrompt(candidateTitles, contextText, count) {
  const context = contextText.slice(0, MAX_CONTEXT_CHARS);
  const list = candidateTitles
    .slice(0, MAX_CANDIDATES_SENT)
    .map((t, i) => `${i + 1}. ${t}`)
    .join("\n");

  return (
    `You are helping a student build a revision tracker from their study notes.\n` +
    `Below is text extracted from their document, followed by a list of candidate ` +
    `"topics" produced by a naive keyword extractor.\n\n` +
    `Your job: return the REAL study topics only.\n\n` +
    `A real topic is a concept, term, disease, procedure, or named entity a student ` +
    `would revise as one unit (e.g. "Placenta Previa", "Breech Delivery", "Bishop Score", ` +
    `"Postpartum Hemorrhage", "Rh Isoimmunisation").\n\n` +
    `REJECT things that are NOT topics:\n` +
    `- full sentences or instructions ("Start Antihypertensives", "Deliver at 37 weeks")\n` +
    `- table rows / fragments ("Consistency of Cervix Firm Average Soft")\n` +
    `- lists of options mashed together, or half-phrases cut mid-idea\n` +
    `- generic umbrella words that are just the document's subject\n\n` +
    `You may FIX wording (proper casing, expand obvious abbreviations, trim junk) and ` +
    `ADD clearly important topics that appear in the text but are missing from the list. ` +
    `Prefer the candidate list, but you are not limited to it.\n\n` +
    `Return AT MOST ${count} topics, most important first.\n` +
    `Return ONLY a JSON array of strings, no markdown, no commentary. Example: ` +
    `["Placenta Previa", "Breech Delivery", "Bishop Score"]\n\n` +
    `--- DOCUMENT TEXT ---\n${context}\n\n` +
    `--- CANDIDATE TOPICS ---\n${list}\n`
  );
}

/**
 * @param {Array<{id?:string,title:string,difficulty?:string,importance?:number}>} candidates
 *        Topics from pdfExtractor (already ordered by importance).
 * @param {string} contextText  Full extracted PDF text.
 * @param {number} count        How many topics the user wants.
 * @returns {Promise<{topics:Array, usedAi:boolean, error?:string}>}
 */
export async function refineTopics(candidates, contextText, count) {
  const localTrimmed = (candidates || []).slice(0, count);

  // No key → nothing to do, just return the local list trimmed.
  if (!hasAiKey()) {
    return { topics: localTrimmed, usedAi: false };
  }
  if (!candidates || candidates.length === 0) {
    return { topics: [], usedAi: false };
  }

  try {
    const prompt = buildPrompt(
      candidates.map((c) => c.title),
      contextText || "",
      count
    );
    const raw = await callGeminiText(prompt);
    const arr = extractJsonArray(raw);

    // Bad/empty AI response → fall back to local, don't break the upload.
    if (!Array.isArray(arr) || arr.length === 0) {
      return { topics: localTrimmed, usedAi: false, error: "AI returned no usable topics." };
    }

    // Clean the AI titles and map each back onto a candidate (to keep its
    // difficulty/importance where possible); otherwise mint a fresh topic.
    const byNorm = new Map(
      candidates.map((c) => [normalize(c.title), c])
    );

    const seen = new Set();
    const refined = [];
    arr.forEach((item, idx) => {
      const title = String(item || "").trim();
      if (!title || title.length < 2 || title.length > 80) return;
      const norm = normalize(title);
      if (!norm || seen.has(norm)) return;
      seen.add(norm);

      const match = byNorm.get(norm);
      refined.push({
        id: match?.id || `pdf-ai-${Date.now()}-${idx}`,
        title,
        difficulty: match?.difficulty || "Medium",
        importance: match?.importance ?? Math.max(5, 100 - idx * 4),
      });
    });

    if (refined.length === 0) {
      return { topics: localTrimmed, usedAi: false, error: "AI returned no usable topics." };
    }
    return { topics: refined.slice(0, count), usedAi: true };
  } catch (err) {
    // Any AI failure (network, overloaded, bad key) → graceful local fallback.
    return {
      topics: localTrimmed,
      usedAi: false,
      error: err?.message || "AI verification failed.",
    };
  }
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
