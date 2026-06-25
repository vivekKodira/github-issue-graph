/**
 * Tiny hash-based router for the question flow. Hash deep-linking works
 * independently of Vite's `base` (the hash is never sent to the server), so
 * it's GH-Pages-safe.
 *
 *   #/q/<questionId>  → an answer view
 *   #/  (or empty)    → the question list
 */

const LAST_QUESTION_KEY = "lastQuestionId";

/** Returns the question id if the hash points at an answer, else null. */
export function readQuestionFromHash(): string | null {
  const m = window.location.hash.match(/^#\/q\/([A-Za-z0-9_-]+)$/);
  return m ? m[1] : null;
}

/** Write the hash for an answer view (no-op if already set, to avoid loops). */
export function writeAnswerHash(questionId: string): void {
  const desired = `#/q/${questionId}`;
  if (window.location.hash !== desired) window.location.hash = desired;
}

/** Write the hash for the question list (no-op if already there). */
export function writeListHash(): void {
  // Use "#/" so the bare path stays clean and back/forward is predictable.
  if (window.location.hash && window.location.hash !== "#/") {
    window.location.hash = "#/";
  }
}

/** Remember the last-viewed question across sessions. */
export function rememberLastQuestion(questionId: string): void {
  try {
    localStorage.setItem(LAST_QUESTION_KEY, questionId);
  } catch {
    /* ignore storage errors */
  }
}

export function getLastQuestion(): string | null {
  try {
    return localStorage.getItem(LAST_QUESTION_KEY);
  } catch {
    return null;
  }
}
