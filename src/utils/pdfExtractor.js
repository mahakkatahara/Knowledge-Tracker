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
  // umbrella / subject-level words that are the *theme* of a document,
  // never a section topic on their own ("Data Structure", "Algorithm"...)
  "structure", "algorithm", "program", "programming", "language", "code",
  "computer", "science", "study", "learning", "course", "syllabus", "unit",
  "module", "lecture", "important", "basic", "advanced", "type", "application",
]);

// Common verbs seen in explanatory prose. A topic is a NOUN phrase — any
// candidate containing one of these is a sentence fragment ("Stack Overflow
// Occurs", "List Stores Nodes"), not a topic, so it is rejected outright.
const PROSE_VERBS = new Set([
  "occurs", "occur", "allows", "allow", "avoids", "avoid", "stores", "store",
  "updates", "update", "includes", "include", "provides", "provide",
  "requires", "require", "contains", "contain", "ensures", "ensure",
  "means", "mean", "refers", "refer", "consists", "consist", "depends",
  "depend", "becomes", "become", "remains", "remain", "involves", "involve",
  "follows", "follow", "performs", "perform", "represents", "represent",
  "defines", "define", "describes", "describe", "denotes", "denote",
  "holds", "hold", "takes", "take", "gives", "give", "gets", "get",
  "uses", "makes", "make", "needs", "need", "helps", "help", "shows", "show",
  "works", "runs", "run", "calls", "call", "returns", "creates", "create",
  "adds", "add", "removes", "remove", "deletes", "delete", "inserts",
  "insert", "keeps", "keep", "visits", "visit", "compares", "compare",
  "divides", "divide", "arranges", "arrange", "affects", "affect",
  "operates", "operate", "picks", "pick", "supports", "support",
  "enables", "enable", "offers", "offer", "known", "called", "explain",
  "explains", "explained", "discuss", "discussed", "write", "written",
  "converts", "convert", "absorbs", "absorb", "regulate", "regulates",
  "fixes", "produce", "produces", "release", "releases", "controls",
  "control", "transports", "transport", "packages", "package", "connects",
  "connect", "swaps", "swap", "splits", "split", "merges", "merge",
  "partitions", "partition", "maintains", "maintain", "fills", "fill",
  // imperative verbs common in instructions / management steps
  "start", "give", "deliver", "repeat", "perform", "avoid", "check",
  "monitor", "consider", "prepare", "rotate", "push", "roll", "call",
  "evaluate", "stop", "relieve", "lift", "apply", "administer", "assess",
  "manage", "treat", "confirm", "rule", "prevent", "reduce", "increase",
]);
const hasProseVerb = (words) => words.some((w) => PROSE_VERBS.has(w));

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
    if (PROSE_VERBS.has(w)) return false;      // verbs aren't topics ("Converts", "Absorbs")
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
    // A real section heading is short. Longer title-case lines are usually
    // table rows ("Consistency of Cervix Firm Average Soft") or sentences.
    if (words.length < 1 || words.length > 5) continue;
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
  // When the caller over-extracts (a big maxTopics pool) but really only wants
  // `finalCount` topics shown, we stratify the FIRST finalCount across the whole
  // PDF and put them at the front of the returned list. That way a later
  // `slice(0, finalCount)` (the no-AI fallback in StudyTracker) still gets a
  // spread-out set, and an AI re-ranker gets a rich pool. Defaults to maxTopics.
  const finalCount = Math.min(opts.finalCount || maxTopics, maxTopics);

  const tokens = tokenize(rawText);
  const content = tokens.filter(isContentWord);
  if (content.length === 0) return [];

  // 1. Unigram term frequency
  const unigramTF = new Map();
  for (const w of content) unigramTF.set(w, (unigramTF.get(w) || 0) + 1);

  // 1a. Page awareness. extractTextFromPdf inserts "\f" between pages. If the
  //     marker is absent (plain-text input / older callers) the whole doc is a
  //     single page and every page-aware step below degrades gracefully to the
  //     previous behaviour. We record which page(s) each word / phrase lives on
  //     so the final selection can span the WHOLE PDF instead of clustering in
  //     the first few (heavily-repeated) pages.
  const pages = rawText.split("\f");
  const numPages = pages.length;
  const unigramPages = new Map(); // word   -> Map(pageIdx -> count)
  const phrasePagesMap = new Map(); // phrase -> Map(pageIdx -> count)
  const bumpPage = (store, key, pageIdx) => {
    let m = store.get(key);
    if (!m) store.set(key, (m = new Map()));
    m.set(pageIdx, (m.get(pageIdx) || 0) + 1);
  };
  pages.forEach((pageText, pageIdx) => {
    for (const w of tokenize(pageText)) {
      if (isContentWord(w)) bumpPage(unigramPages, w, pageIdx);
    }
  });
  // The page where a candidate is most concentrated (ties -> earliest page).
  const homePageOf = (words) => {
    // Prefer the phrase's own page distribution when we have it.
    const key = words.join(" ");
    const pm = phrasePagesMap.get(key);
    const pick = (m) => {
      let best = -1, bestCount = -1;
      for (const [p, c] of m) {
        if (c > bestCount || (c === bestCount && (best === -1 || p < best))) {
          best = p; bestCount = c;
        }
      }
      return best;
    };
    if (pm && pm.size) return pick(pm);
    // Otherwise the earliest page that contains every word of the candidate.
    for (let p = 0; p < numPages; p++) {
      if (words.every((w) => (unigramPages.get(w) || new Map()).has(p))) return p;
    }
    // Last resort: earliest page of the rarest (most distinctive) word.
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

  // 1b. Burstiness analysis — the key to separating real *topics* from the
  //     document's overall *theme*. Split the doc into fixed windows of
  //     content words; a genuine topic (e.g. "stack", "queue") is
  //     concentrated in a few windows, while theme words (e.g. "data",
  //     "structure", "algorithm" in a DSA book) appear in almost every
  //     window. Theme words are suppressed; bursty words are boosted (TF-IDF).
  const WINDOW = 120;
  const windows = [];
  for (let i = 0; i < content.length; i += WINDOW) {
    windows.push(new Set(content.slice(i, i + WINDOW).map(stem)));
  }
  const numChunks = windows.length;
  const df = new Map(); // stem -> number of windows containing it
  for (const set of windows) {
    for (const s of set) df.set(s, (df.get(s) || 0) + 1);
  }
  const idfOf = (w) => {
    const d = df.get(stem(w)) || 1;
    return Math.log(1 + numChunks / d);
  };
  // A word is a "theme word" when the doc is long enough to judge (5+ windows)
  // and the word shows up in 60%+ of them.
  const isThemeWord = (w) =>
    numChunks >= 5 && (df.get(stem(w)) || 0) / numChunks >= 0.6;
  // A candidate is the doc's *subject* (not a topic) when theme/generic words
  // form a strict majority of it. "Data Structure" / "Linear Data Structure"
  // in a DSA doc -> rejected; "Data Mining" (1 of 2 bursty) -> kept.
  const isThemeCandidate = (words) => {
    const themey = words.filter(
      (w) => isThemeWord(w) || GENERIC_WORDS.has(stem(w))
    ).length;
    return themey / words.length > 0.5;
  };
  const avgIdf = (words) =>
    words.reduce((s, w) => s + idfOf(w), 0) / words.length;

  // 2. Bigram / trigram frequency over consecutive content words.
  //    Phrases are built *within* sentence/line segments so unrelated words
  //    either side of punctuation never merge (e.g. "...per node. Linked List"
  //    must not yield the phantom topic "Node Linked").
  const phraseTF = new Map();
  let run = [];
  let runPage = 0; // page index of the segment currently being scanned
  const flushRun = () => {
    for (let i = 0; i < run.length; i++) {
      for (let n = 2; n <= 3; n++) {
        if (i + n <= run.length) {
          const phrase = run.slice(i, i + n).join(" ");
          phraseTF.set(phrase, (phraseTF.get(phrase) || 0) + 1);
          bumpPage(phrasePagesMap, phrase, runPage);
        }
      }
    }
    run = [];
  };
  // Iterate page-by-page so each phrase is attributed to the page it occurs on.
  pages.forEach((pageText, pageIdx) => {
    runPage = pageIdx;
    const segs = pageText.split(/[.,;:!?()[\]{}"'\u2018\u2019\u201C\u201D\n\r\u2022\u2013\u2014]+/);
    for (const seg of segs) {
      for (const w of tokenize(seg)) {
        if (isContentWord(w)) run.push(w);
        else flushRun(); // stop-word also breaks a phrase
      }
      flushRun(); // segment boundary breaks a phrase
    }
  });

  // 3. Heading candidates get a strong boost
  const headings = detectHeadings(rawText);
  const headingSet = new Map(); // normalized -> original
  for (const h of headings) {
    const norm = tokenize(h).filter(isContentWord).join(" ");
    if (norm) headingSet.set(norm, h);
  }

  // 4. Build a unified candidate pool with scores
  const candidates = new Map(); // key(normalized) -> { display, score, words }

  const addCandidate = (normalized, display, score, words) => {
    const existing = candidates.get(normalized);
    if (!existing || score > existing.score) {
      candidates.set(normalized, {
        display,
        score,
        words,
        homePage: homePageOf(words),
      });
    }
  };

  // phrases (preferred — they read like real topics)
  for (const [phrase, freq] of phraseTF.entries()) {
    if (freq < 2) continue; // must recur to count as a topic
    const words = phrase.split(" ");
    if (isThemeCandidate(words)) continue; // "data structure" in a DSA doc = theme, not a topic
    if (hasProseVerb(words)) continue; // "stack overflow occurs" = sentence fragment
    // A truncated fragment like "Linear Data" (cut from "linear data
    // structure") contains a generic/theme word. Real section topics that
    // legitimately contain one ("Sorting Algorithms") appear as headings and
    // are rescued below in the heading loop.
    if (
      !headingSet.has(phrase) &&
      words.some((w) => isThemeWord(w) || GENERIC_WORDS.has(stem(w)))
    )
      continue;
    const wordScore = words.reduce((s, w) => s + (unigramTF.get(w) || 0), 0);
    const lengthBonus = 1 + (words.length - 1) * 0.4;
    let score = (freq * 3 * lengthBonus + wordScore * 0.2) * avgIdf(words);
    if (headingSet.has(phrase)) score *= 1.8;
    addCandidate(phrase, titleCase(phrase), score, words);
  }

  // headings that aren't already phrase candidates
  for (const [norm, original] of headingSet.entries()) {
    if (candidates.has(norm)) continue;
    const words = norm.split(" ");
    if (isThemeCandidate(words)) continue; // doc-title headings like "Data Structures"
    const wordScore = words.reduce((s, w) => s + (unigramTF.get(w) || 0), 0);
    const score = (6 + wordScore * 0.5 + words.length) * avgIdf(words);
    addCandidate(norm, titleCase(original.replace(/\s+/g, " ")), score, words);
  }

  // strong standalone keywords (only if not already inside a chosen phrase later)
  const sortedUnigrams = [...unigramTF.entries()].sort((a, b) => b[1] - a[1]);
  for (const [word, freq] of sortedUnigrams.slice(0, 25)) {
    if (freq < 3) continue;
    if (isThemeWord(word)) continue; // "algorithm" 200x in an algo book ≠ topic
    addCandidate(word, titleCase(word), freq * idfOf(word), [word]);
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
    // Extra guard: a lone single word (e.g. a stray verb like "Converts")
    // only qualifies if it's an actual heading or recurs — multi-word phrases
    // and headings are always allowed.
    ranked = ranked.filter((c) => {
      if (!isQualityTopic(c.words)) return false;
      const norm = c.words.join(" ");
      if (headingSet.has(norm)) return true; // real heading
      if (c.words.length >= 2) return true; // a phrase reads like a topic
      return support(c.words) >= 2; // lone word must recur
    });
  }

  // 6. Selection with near-duplicate / overlap suppression.
  //    Stems are used so singular/plural variants collapse to one.
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

  if (numPages > 1 && ranked.length > finalCount) {
    // Page-stratified selection. Without this, pure score order clusters every
    // winner in the first few pages (intro/recap pages repeat terms heavily),
    // so a 30-page PDF would return topics all from pages 1-8 — even when the
    // user asked for only 5. We split the document into `finalCount` page
    // buckets and take the strongest topic from EACH bucket, so the topics the
    // user actually sees span the whole PDF. Remaining slots (up to maxTopics,
    // the over-extraction pool for the AI verifier) are filled from the global
    // ranking afterwards.
    const bucketOf = (p) =>
      Math.min(finalCount - 1, Math.floor((p * finalCount) / numPages));
    const byBucket = Array.from({ length: finalCount }, () => []);
    for (const c of ranked) byBucket[bucketOf(c.homePage ?? 0)].push(c);

    // Pass 1: one strong topic per bucket, front to back → whole-PDF coverage.
    const stratified = [];
    for (const bucket of byBucket) {
      if (stratified.length >= finalCount) break;
      for (const c of bucket) {
        if (tryChoose(c)) { stratified.push(c); break; }
      }
    }
    // Pass 2: fill remaining bucket slots (empty/all-duplicate buckets) from
    // the global ranking so we still surface finalCount spread-out topics.
    if (stratified.length < finalCount) {
      for (const c of ranked) {
        if (stratified.length >= finalCount) break;
        if (tryChoose(c)) stratified.push(c);
      }
    }
    // Order the visible set by document flow — reads like the PDF's syllabus.
    stratified.sort((a, b) => (a.homePage ?? 0) - (b.homePage ?? 0));
    chosen.length = 0;
    chosen.push(...stratified);

    // Pass 3: pad the pool up to maxTopics (for the AI verifier) with the next
    // best remaining candidates, still skipping near-duplicates.
    if (chosen.length < maxTopics) {
      for (const c of ranked) {
        if (chosen.length >= maxTopics) break;
        tryChoose(c);
      }
    }
  } else {
    // Single page, plain-text input, or fewer candidates than requested:
    // original greedy-by-score behaviour.
    for (const c of ranked) {
      if (chosen.length >= maxTopics) break;
      tryChoose(c);
    }
  }

  if (chosen.length === 0) {
    // Last-resort fallback for tiny docs where nothing recurred. Prefer real
    // headings first (these are the section titles the user actually wants),
    // then fall back to word-like, non-generic, non-verb unigrams. We never
    // dump raw gibberish or stray verbs ("Converts") just to fill the list.
    for (const [norm, original] of headingSet.entries()) {
      const words = norm.split(" ");
      if (isQualityTopic(words) && !isThemeCandidate(words)) {
        chosen.push({ display: titleCase(original), words, score: 5 });
      }
      if (chosen.length >= maxTopics) break;
    }
    if (chosen.length === 0) {
      for (const [word] of sortedUnigrams) {
        // single fallback words must be nouns (not verbs), real, and non-generic
        if (
          isQualityTopic([word]) &&
          !isThemeWord(word) &&
          !PROSE_VERBS.has(word)
        ) {
          chosen.push({ display: titleCase(word), words: [word], score: unigramTF.get(word) });
        }
        if (chosen.length >= maxTopics) break;
      }
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
    // "\f" (form feed) marks a page boundary so topic selection can be
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
