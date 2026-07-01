/**
 * decayEngine.js
 * 
 * Centralized business logic for tracking knowledge decay, calculating 
 * memory retention, classifying forget-risk, and prioritizing revision recommendations.
 * 
 * Keep formulas simple, deterministic, and beginner-friendly.
 */

// "Today" — derived from the real system clock so every stat (days elapsed,
// retention, streak, weekly hours, study-time-this-week) reflects actual dates,
// not a frozen simulation date.
export const REFERENCE_DATE = new Date().toISOString().split("T")[0];

/**
 * Calculates the calendar days elapsed between two dates.
 * Falls back to the current system date if referenceDate is not provided.
 * 
 * @param {string} dateString - The target date in YYYY-MM-DD format.
 * @param {string} [referenceDate] - The reference date (defaults to REFERENCE_DATE).
 * @returns {number} The integer number of days elapsed (>= 0).
 */
export function getDaysElapsed(dateString, referenceDate = REFERENCE_DATE) {
  if (!dateString) return 0;
  const target = new Date(dateString);
  const current = referenceDate ? new Date(referenceDate) : new Date();
  
  // Calculate difference in milliseconds
  const diffTime = current - target;
  
  // Convert milliseconds to days, rounding up to match calendar days
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Calculates the memory retention percentage (0-100) using a power-based
 * Ebbinghaus decay simulation.
 * 
 * Formula:
 *   R = BaseScore * (RetentionRate ^ DaysElapsed)
 * 
 * @param {Object} topic - The topic object from state.
 * @param {string} [referenceDate] - The reference date (defaults to REFERENCE_DATE).
 * @returns {number} An integer retention percentage (10 to 100).
 */
export function calculateRetention(topic, referenceDate = REFERENCE_DATE) {
  if (!topic) return 0;
  const daysElapsed = getDaysElapsed(topic.lastStudied, referenceDate);

  // 1. Calculate BaseScore: starting point based on study quality (max 100)
  // Weighted: quizScore contributes up to 60%, confidenceScore (1-5) contributes up to 40%
  const quizWeight = (topic.quizScore || 0) * 0.6;
  const confidenceWeight = (topic.confidenceScore || 0) * 8;
  const baseScore = Math.min(100, Math.max(10, quizWeight + confidenceWeight));

  // 2. Determine base retention rate (percentage of memory kept per day) based on difficulty
  let baseRate = 0.90; // Default Medium (10% decay per day)
  if (topic.difficulty === "Easy") {
    baseRate = 0.95; // Easy (5% decay per day)
  } else if (topic.difficulty === "Hard") {
    baseRate = 0.85; // Hard (15% decay per day)
  }

  // 3. Spaced Repetition multiplier: each revision slows the daily decay rate
  // As revisions increase, the daily retention rate approaches 1.0 (no decay)
  const revisionCount = topic.revisionCount || 0;
  const revisionFactor = 1 - (1 / (1 + revisionCount * 0.5));
  const dailyRetentionRate = baseRate + (1 - baseRate) * revisionFactor;

  // 4. Calculate current retention: baseScore decays exponentially over elapsed days
  const retention = baseScore * Math.pow(dailyRetentionRate, daysElapsed);

  // Round and clamp between 10% (minimum recognition threshold) and 100%
  return Math.min(100, Math.max(10, Math.round(retention)));
}

/**
 * Determines the forget risk category and numeric score from a retention score.
 * 
 * @param {number} retention - The memory retention percentage (0-100).
 * @returns {Object} { score: number, category: "High" | "Medium" | "Low" }
 */
export function getForgetRisk(retention) {
  // Forget risk is the inverse of retention
  const score = 100 - retention;

  let category = "Low";
  if (score >= 60) {
    category = "High";
  } else if (score >= 30) {
    category = "Medium";
  }

  return { score, category };
}

/**
 * Calculates a Priority Recommendation Score (0-100) used for ranking topics.
 * Bubbles up topics with high forget risk and higher difficulty.
 * 
 * @param {Object} topic - The topic object.
 * @param {string} [referenceDate] - The reference date.
 * @returns {number} The rounded priority score (0-100).
 */
export function calculatePriorityScore(topic, referenceDate = REFERENCE_DATE) {
  const retention = calculateRetention(topic, referenceDate);
  const forgetRisk = 100 - retention;

  // Difficulty weight mapping (Easy = 0.3, Medium = 0.6, Hard = 1.0)
  let difficultyWeight = 0.6;
  if (topic.difficulty === "Easy") {
    difficultyWeight = 0.3;
  } else if (topic.difficulty === "Hard") {
    difficultyWeight = 1.0;
  }

  // Combine risk (80%) and difficulty (20%)
  const priorityScore = (forgetRisk * 0.8) + (difficultyWeight * 20);

  return Math.min(100, Math.max(0, Math.round(priorityScore)));
}

/**
 * Analyzes topics and returns revision recommendations sorted by priority.
 * 
 * @param {Array<Object>} topics - The array of topic objects.
 * @param {string} [referenceDate] - The reference date.
 * @returns {Array<Object>} The topics annotated with retention, risk, and priority, sorted descending.
 */
export function getRevisionRecommendations(topics, referenceDate = REFERENCE_DATE) {
  if (!topics || !Array.isArray(topics)) return [];
  return topics
    .map(topic => {
      const retention = calculateRetention(topic, referenceDate);
      const riskObj = getForgetRisk(retention);
      const priorityScore = calculatePriorityScore(topic, referenceDate);
      const daysElapsed = getDaysElapsed(topic.lastStudied, referenceDate);

      return {
        ...topic,
        retentionVal: retention,
        riskScore: riskObj.score,
        risk: riskObj.category,
        priorityScore,
        daysElapsed
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
