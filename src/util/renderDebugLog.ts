/**
 * Debug log for Render flow. Written to localStorage so you can check after
 * the issue happens (e.g. when devtools was closed).
 *
 * View log: click "View debug log" on the page, or open devtools and run:
 *   localStorage.getItem('github-issue-graph-render-log')
 */

const KEY = "github-issue-graph-render-log";
const MAX_LINES = 200;

function getLines(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? raw.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function setLines(lines: string[]) {
  try {
    const kept = lines.slice(-MAX_LINES);
    localStorage.setItem(KEY, kept.join("\n"));
  } catch {
    // ignore quota or other errors
  }
}

export function appendRenderLog(line: string): void {
  const ts = new Date().toISOString();
  const lines = getLines();
  lines.push(`${ts} ${line}`);
  setLines(lines);
}

export function getRenderLog(): string {
  return getLines().join("\n") || "(empty)";
}

export function clearRenderLog(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
