/**
 * pdfExtractor.js
 *
 * Reads an uploaded PDF entirely in the browser, pulls out the most important
 * topics using a lightweight Information-Retrieval pipeline (tokenization,
 * stop-word removal, TF + key-phrase scoring), and converts each topic into a
 * study-topic object that the rest of the app already understands.
 *
 * The text -> topics logic (`extractTopicsFromText`) is intentionally kept free
 * of any PDF/browser dependency so it can be unit-tested with plain Node.
 */

// (Risk is computed by decayEngine inside the app, after the user enters
//  quiz/confidence — so this module no longer fabricates any scores.)

// A compact but effective English stop-word list.
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had",
  "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how",
  "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its",
  "let", "put", "say", "she", "too", "use", "that", "this", "with", "from",
  "they", "will", "would", "there", "their", "what", "about", "which", "when",
  "make", "like", "time", "just", "know", "take", "into", "your", "some",
  "could", "them", "than", "then", "look", "only", "come", "over", "also",
  "back", "after", "use", "work", "first", "well", "even", "want", "because",
  "these", "give", "most", "us", "is", "it", "in", "on", "of", "to", "a", "an",
  "as", "at", "be", "by", "or", "if", "do", "so", "we", "he", "no", "up", "my",
  "me", "i", "such", "may", "each", "more", "very", "much", "many", "where",
  "while", "those", "been", "being", "were", "shall", "should", "must", "here",
  "thus", "hence", "etc", "via", "per", "using", "used", "based", "given",
  "within", "between", "above", "below", "under", "again", "both", "few",
  "other", "same", "own", "during", "before", "through", "however", "therefore",
  "example", "examples", "chapter", "section", "figure", "table", "page",
]);

const WORD_RE = /[a-zA-Z][a-zA-Z'-]+/g;

function tokenize(text) {
  const matches = text.toLowerCase().match(WORD_RE) || [];
  return matches.map((w) => w.replace(/^['-]+|['-]+$/g, ""));
}

function isContentWord(w) {
  return w.length >= 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w);
}

// Words that are real English but too generic to be a *topic* on their own
// (stored as singular base forms; compared via stem()).
const GENERIC_WORDS = new Set([
  "value", "result", "return", "number", "element", "item", "case", "step",
  "point", "part", "name", "thing", "idea", "note", "page", "line", "word",
  "letter", "content", "introduction", "overview", "summary", "conclusion",
  "definition", "concept", "topic", "question", "answer", "problem", "exercise",
  "solution", "output", "input", "detail", "feature", "data", "information",
  "process", "system", "method", "approach", "technique", "property", "operation",
  "function", "variable", "object", "instance", "reference", "parameter",
  "argument", "statement", "expression", "condition", "iteration", "default",
]);

// Lightweight singular/plural stemmer — only to collapse duplicates.
function stem(w) {
  w = w.toLowerCase();
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// Heuristic "is this a real-looking English word?" — drops PDF garble such as
// "Nodet" / "Oremove" produced by broken word boundaries in some PDFs.
function looksWordLike(w) {
  if (w.length < 3) return false;
  if (!/[aeiou]/.test(w)) return false;        // a word needs a vowel
  if (/[^aeiou]{5,}/.test(w)) return false;    // 5+ consonants in a row = junk
  if (/(.)\1\1/.test(w)) return false;         // 3+ identical letters = junk
  if (/q[bcdfghjklmnpqrstvwxyz]/.test(w)) return false; // 'q' not followed by a vowel = junk
  return true;
}

// A candidate is a usable topic only if it isn't generic/gibberish.
function isQualityTopic(words) {
  if (!words.length) return false;
  for (const w of words) {
    if (!looksWordLike(w)) return false;       // any garbled word kills it
  }
  const meaningful = words.filter((w) => w.length >= 3 && !GENERIC_WORDS.has(stem(w)));
  if (meaningful.length === 0) return false;   // all words generic -> drop
  if (words.length === 1) {
    const w = words[0];
    if (w.length < 4 || GENERIC_WORDS.has(stem(w))) return false;
  }
  return true;
}

function titleCase(str) {
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Cleans junk that slide-deck / lecture-note PDFs leave on headings so topics
 * read like real subjects, not slide IDs. Strips things like:
 *   "D5 Data Mining" -> "Data Mining"
 *   "Query: Machine Learning" -> "Machine Learning"
 *   "Unit 3 Thermodynamics" -> "Thermodynamics"
 *   "7. Big Data" / "II Genetics" -> "Big Data" / "Genetics"
 * and trims stray leading/trailing punctuation.
 */
function cleanTopicTitle(str) {
  let s = (str || "").trim();
  // Leading label words (Unit/Module/Chapter/Lecture/Slide/Topic/Query/...) + optional number/colon
  s = s.replace(
    /^(unit|module|chapter|lecture|section|topic|slide|part|day|week|query|note|notes|objective|outcome)s?\b[-\s:.]*\d*[-\s:.]*/i,
    ""
  );
  // Leading slide/section codes: "D5", "Q1", "C4", a bare number, or roman numerals
  s = s.replace(/^(?:[a-z]\d{1,3}|\d{1,3}|[ivxlcdm]{1,4})[.):\-\s]+/i, "");
  // Strip stray leading/trailing punctuation/whitespace
  s = s.replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, "");
  return s.trim();
}

/**
 * Detects heading-like lines (short, Title-Case or ALL-CAPS, no ending period).
 * These are strong topic candidates in study notes / textbooks.
 */
function detectHeadings(rawText) {
  const headings = [];
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    if (words.length < 1 || words.length > 7) continue;
    if (/[.:;,]$/.test(trimmed)) continue;
    const letters = trimmed.replace(/[^a-zA-Z]/g, "");
    if (letters.length < 4) continue;
    const isAllCaps = letters === letters.toUpperCase() && letters.length > 3;
    const capitalised = words.filter((w) => /^[A-Z]/.test(w)).length;
    const isTitleCase = capitalised >= Math.ceil(words.length * 0.6);
    if (isAllCaps || isTitleCase) {
      const cleaned = trimmed.replace(/^[0-9.)\s-]+/, "").trim();
      const contentTokens = tokenize(cleaned).filter(isContentWord);
      if (contentTokens.length >= 1) headings.push(cleaned);
    }
  }
  return headings;
}

/**
 * Core IR routine: turn raw text into ranked, scored topics.
 * Returns an array of topic objects ready for the study tracker.
 *
 * @param {string} rawText
 * @param {Object} [opts]
 * @param {number} [opts.maxTopics=8]
 * @param {string} [opts.sourceFile]
 * @returns {Array<Object>}
 */
export function extractTopicsFromText(rawText, opts = {}) {
  const maxTopics = opts.maxTopics || 8;

  const tokens = tokenize(rawText);
  const content = tokens.filter(isContentWord);
  if (content.length === 0) return [];

  // ---- Page awareness -------------------------------------------------
  // extractTextFromPdf inserts "\f" between pages. If the marker is absent
  // (plain text input / old callers) the whole doc counts as one page and
  // everything below degrades gracefully to the previous behaviour.
  const pages = rawText.split("\f");
  const numPages = pages.length;

  // page-index -> local count, per term / phrase. Used to (a) know WHERE a
  // candidate lives and (b) guarantee topic coverage across the whole PDF.
  const unigramPages = new Map(); // word   -> Map(pageIdx -> count)
  const phrasePages = new Map();  // phrase -> Map(pageIdx -> count)
  const bump = (store, key, pageIdx) => {
    let m = store.get(key);
    if (!m) store.set(key, (m = new Map()));
    m.set(pageIdx, (m.get(pageIdx) || 0) + 1);
  };

  // 1. Unigram term frequency (global) + per-page counts
  const unigramTF = new Map();
  pages.forEach((pageText, pageIdx) => {
    for (const w of tokenize(pageText)) {
      if (!isContentWord(w)) continue;
      unigramTF.set(w, (unigramTF.get(w) || 0) + 1);
      bump(unigramPages, w, pageIdx);
    }
  });

  // 2. Bigram / trigram frequency over consecutive content words.
  //    Phrases are built *within* sentence/line segments so unrelated words
  //    either side of punctuation never merge (e.g. "...per node. Linked List"
  //    must not yield the phantom topic "Node Linked").
  const phraseTF = new Map();
  pages.forEach((pageText, pageIdx) => {
    let run = [];
    const flushRun = () => {
      for (let i = 0; i < run.length; i++) {
        for (let n = 2; n <= 3; n++) {
          if (i + n <= run.length) {
            const phrase = run.slice(i, i + n).join(" ");
            phraseTF.set(phrase, (phraseTF.get(phrase) || 0) + 1);
            bump(phrasePages, phrase, pageIdx);
          }
        }
      }
      run = [];
    };
    const segments = pageText.split(/[.,;:!?()[\]{}"'\u2018\u2019\u201C\u201D\n\r\u2022\u2013\u2014]+/);
    for (const seg of segments) {
      for (const w of tokenize(seg)) {
        if (isContentWord(w)) run.push(w);
        else flushRun(); // stop-word also breaks a phrase
      }
      flushRun(); // segment boundary breaks a phrase
    }
  });

  // The page where a candidate is most concentrated (ties -> earliest page).
  const homePageOf = (key, isPhrase, words) => {
    const m = isPhrase ? phrasePages.get(key) : unigramPages.get(key);
    if (m && m.size) {
      let best = -1, bestCount = -1;
      for (const [p, c] of m) {
        if (c > bestCount || (c === bestCount && p < best)) { best = p; bestCount = c; }
      }
      return best;
    }
    // Heading-only candidates: use the earliest page containing all its words.
    for (let p = 0; p < numPages; p++) {
      if (words.every((w) => (unigramPages.get(w) || new Map()).has(p))) return p;
    }
    // Last resort: earliest page of the rarest word.
    let earliest = 0, rarity = Infinity;
    for (const w of words) {
      const wm = unigramPages.get(w);
      if (!wm) continue;
      const first = Math.min(...wm.keys());
      const freq = unigramTF.get(w) || Infinity;
      if (freq < rarity) { rarity = freq; earliest = first; }
    }
    return earliest;
  };

  // 3. Heading candidates get a strong boost
  const headings = detectHeadings(rawText);
  const headingSet = new Map(); // normalized -> original
  for (const h of headings) {
    const norm = tokenize(h).filter(isContentWord).join(" ");
    if (norm) headingSet.set(norm, h);
  }

  // 4. Build a unified candidate pool with scores (+ home page for coverage)
  const candidates = new Map(); // key -> { display, score, words, homePage }

  const addCandidate = (normalized, display, score, words, homePage) => {
    const existing = candidates.get(normalized);
    if (!existing || score > existing.score) {
      candidates.set(normalized, { display, score, words, homePage });
    }
  };

  // phrases (preferred — they read like real topics)
  for (const [phrase, freq] of phraseTF.entries()) {
    if (freq < 2) continue; // must recur to count as a topic
    const words = phrase.split(" ");
    const wordScore = words.reduce((s, w) => s + (unigramTF.get(w) || 0), 0);
    const lengthBonus = 1 + (words.length - 1) * 0.4;
    let score = freq * 3 * lengthBonus + wordScore * 0.2;
    if (headingSet.has(phrase)) score *= 1.8;
    addCandidate(phrase, titleCase(phrase), score, words, homePageOf(phrase, true, words));
  }

  // headings that aren't already phrase candidates
  for (const [norm, original] of headingSet.entries()) {
    if (candidates.has(norm)) continue;
    const words = norm.split(" ");
    const wordScore = words.reduce((s, w) => s + (unigramTF.get(w) || 0), 0);
    const score = 6 + wordScore * 0.5 + words.length;
    addCandidate(norm, titleCase(original.replace(/\s+/g, " ")), score, words, homePageOf(norm, false, words));
  }

  // strong standalone keywords (only if not already inside a chosen phrase later)
  const sortedUnigrams = [...unigramTF.entries()].sort((a, b) => b[1] - a[1]);
  for (const [word, freq] of sortedUnigrams.slice(0, 25)) {
    if (freq < 3) continue;
    addCandidate(word, titleCase(word), freq * 1.0, [word], homePageOf(word, false, [word]));
  }

  // 5. Rank
  let ranked = [...candidates.values()].sort((a, b) => b.score - a.score);

  // 5b. Quality gate: drop generic words ("Value"), gibberish from broken PDF
  //     spacing ("Nodet Oremove"), and one-off terms. A genuine topic recurs,
  //     so we require its key word to appear at least twice in the document.
  const support = (words) =>
    words.reduce((m, w) => Math.max(m, unigramTF.get(w) || 0), 0);
  // Strict gate: real-looking, non-generic, and actually recurs in the document.
  const strict = ranked.filter(
    (c) => isQualityTopic(c.words) && support(c.words) >= 2
  );
  if (strict.length) {
    ranked = strict;
  } else {
    // Relaxed gate for very short docs: allow single-occurrence terms but STILL
    // require them to look like real words / non-generic. We never fall back to
    // the raw ranking, so garbled or phantom "topics" are not surfaced.
    ranked = ranked.filter((c) => isQualityTopic(c.words));
  }

  // 6. Page-stratified selection with near-duplicate suppression.
  //
  //    Problem this solves: pure frequency ranking clusters all winners in the
  //    first few pages (intro pages repeat terms heavily), so a 30-page PDF
  //    would yield 8 topics all from pages 1-8. Instead we split the document
  //    into `maxTopics` page buckets and pick the strongest topic *from each
  //    bucket*, so the selection spans the ENTIRE PDF — even when asking for
  //    only 5 topics from 30 pages. Empty buckets (no quality candidate there)
  //    are back-filled from the global ranking in a second pass.
  const chosen = [];
  const coveredStems = new Set();
  const chosenKeys = new Set();

  const tryChoose = (c) => {
    const stems = c.words.map(stem);
    const key = [...new Set(stems)].sort().join(" ");
    if (chosenKeys.has(key)) return false; // exact (stemmed / reordered) dup
    const overlap = stems.filter((s) => coveredStems.has(s)).length;
    if (overlap / stems.length >= 0.6) return false;
    chosen.push(c);
    chosenKeys.add(key);
    stems.forEach((s) => coveredStems.add(s));
    return true;
  };

  if (numPages > 1) {
    // Map a page index to its bucket (0 .. maxTopics-1).
    const bucketOf = (p) =>
      Math.min(maxTopics - 1, Math.floor((p * maxTopics) / numPages));

    // Group ranked candidates by the bucket of their home page. Within a
    // bucket the global ranking order (score desc) is preserved.
    const byBucket = Array.from({ length: maxTopics }, () => []);
    for (const c of ranked) byBucket[bucketOf(c.homePage ?? 0)].push(c);

    // Pass 1: walk buckets front-to-back, best candidate from each — this is
    // what forces coverage of the whole document.
    for (const bucket of byBucket) {
      if (chosen.length >= maxTopics) break;
      for (const c of bucket) {
        if (tryChoose(c)) break; // one topic per bucket in this pass
      }
    }
    // Pass 2: if some buckets were empty / all-duplicates, fill remaining
    // slots from the global ranking so we still return maxTopics when possible.
    if (chosen.length < maxTopics) {
      for (const c of ranked) {
        if (chosen.length >= maxTopics) break;
        tryChoose(c);
      }
    }
    // Present topics in document order (page flow), not raw score order —
    // reads naturally as a syllabus of the PDF.
    chosen.sort((a, b) => (a.homePage ?? 0) - (b.homePage ?? 0));
  } else {
    // Single page / plain text: original greedy behaviour.
    for (const c of ranked) {
      if (chosen.length >= maxTopics) break;
      tryChoose(c);
    }
  }

  if (chosen.length === 0) {
    // fallback: take the top unigrams, but only genuinely word-like, non-generic
    // ones — never raw gibberish just to fill the list.
    for (const [word] of sortedUnigrams) {
      if (isQualityTopic([word])) {
        chosen.push({ display: titleCase(word), words: [word], score: unigramTF.get(word) });
      }
      if (chosen.length >= maxTopics) break;
    }
  }

  if (chosen.length === 0) return [];

  // 6b. Remove any topic whose word-set is a strict subset of another kept topic
  //     (keeps the more descriptive phrase, drops the redundant short one).
  const deduped = chosen.filter((a, ai) => {
    const aSet = new Set(a.words);
    return !chosen.some((b, bi) => {
      if (ai === bi) return false;
      if (b.words.length <= a.words.length) return false;
      return [...aSet].every((w) => b.words.includes(w));
    });
  });
  chosen.length = 0;
  chosen.push(...deduped);

  // 7. Convert each ranked candidate into a *topic suggestion*. We deliberately
  //    do NOT fabricate quiz/confidence/last-studied here — the user enters those
  //    on the review form, and the decay engine then computes the real risk %.
  //    Difficulty is only a suggested default (editable by the user).
  const maxScore = Math.max(...chosen.map((c) => c.score || 0)) || 1;

  // Normalised key for a final, title-level de-duplication. Cleaning + stemming
  // are applied AFTER the earlier greedy pass, so two candidates like
  // "Unit 3 Trees" and "Trees" only collide here — catch them now.
  const finalKey = (title) =>
    tokenize(title)
      .map(stem)
      .filter((w) => w && !STOP_WORDS.has(w))
      .sort()
      .join(" ");

  const seenTitles = new Set();
  const topics = [];
  chosen.forEach((c, idx) => {
    const importance = Math.max(0.05, c.score / maxScore); // 0..1

    let difficulty = "Medium";
    if (c.words.length >= 2 && importance < 0.5) difficulty = "Hard";
    else if (importance > 0.7 && c.words.length === 1) difficulty = "Easy";
    else if (importance < 0.3) difficulty = "Hard";

    const cleaned = cleanTopicTitle(c.display) || titleCase(c.display);
    const key = finalKey(cleaned);
    if (!key || seenTitles.has(key)) return; // skip empty / duplicate titles
    seenTitles.add(key);

    topics.push({
      id: `pdf-${Date.now()}-${idx}`,
      title: cleaned,
      difficulty,
      importance: Math.round(importance * 100), // just for ordering / display
    });
  });

  // Most important topics first.
  return topics;
}

/**
 * Reads a PDF File object in the browser and returns its full text.
 * Uses pdfjs-dist (dynamically imported so it never runs server-side / in tests).
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(file) {
  const pdfjsLib = await import("pdfjs-dist");
  // Vite-friendly worker resolution.
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    // Preserve rough line breaks so heading detection works.
    let lastY = null;
    let line = "";
    for (const item of textContent.items) {
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        fullText += line.trim() + "\n";
        line = "";
      }
      line += item.str + " ";
      lastY = y;
    }
    // "\f" (form feed) marks a page boundary so topic extraction can be
    // page-aware. It sits on its own line and is invisible to tokenization.
    fullText += line.trim() + "\n\f\n";
  }
  return fullText;
}

/**
 * End-to-end helper: PDF File -> extracted, risk-scored study topics.
 *
 * @param {File} file
 * @param {Object} [opts]
 * @returns {Promise<{ topics: Array<Object>, charCount: number, pageText: string }>}
 */
export async function extractTopicsFromPdf(file, opts = {}) {
  const text = await extractTextFromPdf(file);
  const topics = extractTopicsFromText(text, {
    ...opts,
    sourceFile: file.name,
  });
  return { topics, charCount: text.length, pageText: text };
}

/**
 * OCR fallback for scanned / image-only PDFs.
 * Renders each page to a canvas (via pdf.js) and runs Tesseract.js on it.
 * Slow + downloads the OCR engine/lang data on first use (needs internet).
 *
 * @param {File} file
 * @param {(p: {page:number,total:number,stage:string,progress?:number}) => void} [onProgress]
 * @returns {Promise<{ text: string, pagesProcessed: number, totalPages: number }>}
 */
export async function ocrPdf(file, onProgress) {
  const pdfjsLib = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
  const Tesseract = (await import("tesseract.js")).default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPages = Math.min(pdf.numPages, 15); // cap to keep runtime sane

  let fullText = "";
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    if (onProgress) onProgress({ page: pageNum, total: maxPages, stage: "render" });

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 }); // higher scale => better OCR accuracy
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    const { data } = await Tesseract.recognize(canvas, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress({ page: pageNum, total: maxPages, stage: "ocr", progress: m.progress });
        }
      },
    });
    fullText += (data.text || "").trim() + "\n\n";

    // free memory
    canvas.width = 0;
    canvas.height = 0;
  }

  return { text: fullText.trim(), pagesProcessed: maxPages, totalPages: pdf.numPages };
}