import { PROJECT_KEY_CONFIGS } from '@/config/projectKeyConfigs';
import { PROJECT_KEYS } from '@/config/projectKeys';

export const DEFAULT_PROJECT_KEYS = PROJECT_KEY_CONFIGS;

export function createMockTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Test task',
    issue_number: 1,
    repository: 'test-repo',
    repo_owner: 'test-owner',
    labels: [],
    assignees: ['user1'],
    Title: 'Test task',
    Status: 'Done',
    [PROJECT_KEYS.SPRINT]: 'Sprint-1',
    [PROJECT_KEYS.SIZE]: 'M',
    [PROJECT_KEYS.ESTIMATE_DAYS]: 3,
    [PROJECT_KEYS.ACTUAL_DAYS]: 2,
    number: 1,
    body: '',
    state: 'Done',
    html_url: 'https://github.com/test/1',
    links: [],
    createdAt: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

export function createMockPR(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    title: 'Test PR',
    number: 1,
    createdAt: '2024-01-15T00:00:00Z',
    closedAt: '2024-01-16T00:00:00Z',
    mergedAt: '2024-01-16T00:00:00Z',
    state: 'closed',
    body: 'Test body',
    author: 'author1',
    assignees: ['author1'],
    labels: [],
    reviews: [
      {
        state: 'APPROVED',
        author: 'reviewer1',
        comments: [],
      },
    ],
    reviewComments: [
      {
        body: 'Looks good',
        createdAt: '2024-01-15T12:00:00Z',
        author: 'reviewer1',
        path: 'src/index.ts',
        position: 1,
      },
    ],
    reviewStates: ['APPROVED'],
    reviewers: ['reviewer1'],
    additions: 50,
    deletions: 10,
    changedFiles: 3,
    ...overrides,
  };
}
