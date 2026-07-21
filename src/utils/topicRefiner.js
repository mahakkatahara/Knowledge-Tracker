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
    `You are an expert educational AI. Your job is to extract and verify REAL-WORLD study topics from the student's document.\n` +
    `Below is text extracted from the document, followed by a list of candidate "topics" produced by a naive keyword extractor.\n\n` +
    `CRITICAL REQUIREMENT:\n` +
    `Every topic you return MUST be a genuine, real-world educational concept, term, disease, algorithm, theory, procedure, standard named entity, or academic topic (e.g., "Placenta Previa", "Breech Delivery", "Bishop Score", "Binary Search Tree", "Photosynthesis").\n\n` +
    `You MUST verify and check each candidate topic against real-world knowledge. Ask yourself: "Is this a real-world topic/concept that a student would find in a textbook, syllabus, or encyclopedia?" If it is just a local note, a partial phrase, or a specific instruction, REJECT IT.\n\n` +
    `STRICTLY REJECT AND FILTER OUT:\n` +
    `- Action instructions or tasks ("Start Antihypertensives", "Deliver at 37 weeks", "Check blood pressure", "Rotate the patient")\n` +
    `- Full sentences, questions, or statements ("What is a node", "Consistency of Cervix is average", "Trees are hierarchical")\n` +
    `- Incomplete phrases, table cells, or raw fragments ("Consistency of Cervix Firm", "Page 2 lines", "Fig 1.2", "High risk because of")\n` +
    `- Generic words or noisy text that do not represent a distinct, studyable academic topic.\n\n` +
    `You may FIX wording (correct casing, expand abbreviations into full standard terms, e.g. "PPH" -> "Postpartum Hemorrhage") to make them proper real-world study topics, and you can ADD highly important real-world concepts from the document text if the naive extractor missed them.\n\n` +
    `Return AT MOST ${count} topics, ordered by relevance and importance, as a clean JSON array of strings.\n` +
    `Do NOT include any markdown formatting, code blocks, or conversational text. Return ONLY the JSON array.\n\n` +
    `Example output:\n` +
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
