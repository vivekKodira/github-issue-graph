import { PROJECT_KEYS } from '@/config/projectKeys';

export interface TaskFormat {
  id: string | null;
  title: string | null;
  issue_number: number | null;
  repository: string | null;
  repo_owner: string | null;
  labels: string[];
  assignees: string[];
  Title: string | null;
  Status: string;
  [PROJECT_KEYS.SPRINT]: string | null;
  [PROJECT_KEYS.SIZE]: string | null;
  [PROJECT_KEYS.ESTIMATE_DAYS]: number | null;
  [PROJECT_KEYS.ACTUAL_DAYS]: number | null;
  // Fields used by graphCreator
  number: number | null;
  body: string | null;
  state: string;
  html_url: string | null;
  links: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

export function convertRestApiFormat(source: any): TaskFormat {
  return {
    id: source.node_id || null,
    title: source.title || null,
    issue_number: source.number || null,
    repository: source.repository_url?.split("/").pop() || null,
    repo_owner: source.repository_url?.split("/")[4] || null,
    labels: source.labels?.map((label) => label.name) || [],
    assignees: source.assignees?.map((assignee) => assignee.login) || [],
    Title: source.title || null,
    Status: source.state === "closed" ? "Done" : "Todo",
    [PROJECT_KEYS.SPRINT]: null,
    [PROJECT_KEYS.SIZE]: null,
    [PROJECT_KEYS.ESTIMATE_DAYS]: null,
    [PROJECT_KEYS.ACTUAL_DAYS]: null,
    // Fields used by graphCreator
    number: source.number || null,
    body: source.body || null,
    state: source.state || null,
    html_url: source.html_url || null,
    links: []
  };
}

export function convertGraphQLFormat(source: any): TaskFormat {
  return {
    id: source.id || null,
    title: source.title || null,
    issue_number: source.issue_number || null,
    repository: source.repository || null,
    repo_owner: source.repo_owner || null,
    labels: source.labels || [],
    assignees: source.assignees || [],
    Title: source.title || null,
    Status: source.Status || "Todo",
    [PROJECT_KEYS.SPRINT]: source[PROJECT_KEYS.SPRINT] || null,
    [PROJECT_KEYS.SIZE]: source[PROJECT_KEYS.SIZE] || null,
    [PROJECT_KEYS.ESTIMATE_DAYS]: source[PROJECT_KEYS.ESTIMATE_DAYS] || null,
    [PROJECT_KEYS.ACTUAL_DAYS]: source[PROJECT_KEYS.ACTUAL_DAYS] || null,
    // Fields used by graphCreator
    number: source.issue_number || null,
    body: source.body || null,
    state: source.Status || null,
    html_url: source.html_url || null,
    links: []
  };
} 