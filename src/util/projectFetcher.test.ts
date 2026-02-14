// Mock dependencies before imports
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));
jest.mock('./renderDebugLog', () => ({
  appendRenderLog: jest.fn(),
}));
jest.mock('./issueFetcher.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('./commonFunctions.js', () => ({
  fetchFromCache: jest.fn(),
  updateLocalCache: jest.fn(),
}));
jest.mock('./github-project-status-query.js', () => ({
  query: 'mocked-query',
}));

import { flattenGraphQLResponse } from './projectFetcher';
import mainScript from './projectFetcher';
import { fetchFromCache, updateLocalCache } from './commonFunctions.js';

describe('flattenGraphQLResponse', () => {
  it('flattens a complete response with content and fieldValues', () => {
    const response = {
      id: 'item-1',
      content: {
        title: 'Fix login bug',
        number: 42,
        repository: { name: 'my-repo', owner: { login: 'owner1' } },
        labels: { nodes: [{ name: 'bug' }, { name: 'priority-high' }] },
        assignees: { nodes: [{ login: 'dev1' }, { login: 'dev2' }] },
        milestone: { title: 'v1.0' },
        body: 'Issue description',
        state: 'open',
        url: 'https://github.com/owner1/my-repo/issues/42',
        createdAt: '2024-01-15T10:00:00Z',
      },
      fieldValues: {
        nodes: [
          { field: { name: 'Status' }, name: 'In Progress' },
          { field: { name: 'Sprint' }, title: 'Sprint-5' },
          { field: { name: 'Size' }, text: 'Large' },
          { field: { name: 'Priority' }, number: 1 },
        ],
      },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.id).toBe('item-1');
    expect(result.title).toBe('Fix login bug');
    expect(result.issue_number).toBe(42);
    expect(result.repository).toBe('my-repo');
    expect(result.repo_owner).toBe('owner1');
    expect(result.labels).toEqual([{ name: 'bug' }, { name: 'priority-high' }]);
    expect(result.assignees).toEqual(['dev1', 'dev2']);
    expect(result.milestone).toBe('v1.0');
    expect(result.body).toBe('Issue description');
    expect(result.state).toBe('open');
    expect(result.html_url).toBe('https://github.com/owner1/my-repo/issues/42');
    expect(result.createdAt).toBe('2024-01-15T10:00:00Z');
    // Custom field values
    expect(result.Status).toBe('In Progress');
    expect(result.Sprint).toBe('Sprint-5');
    expect(result.Size).toBe('Large');
    expect(result.Priority).toBe(1);
  });

  it('sets Status to Done for closed issues', () => {
    const response = {
      id: 'item-2',
      content: {
        title: 'Closed issue',
        state: 'closed',
        labels: { nodes: [] },
        assignees: { nodes: [] },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.Status).toBe('Done');
  });

  it('sets Status to Todo for open issues', () => {
    const response = {
      id: 'item-3',
      content: {
        title: 'Open issue',
        state: 'open',
        labels: { nodes: [] },
        assignees: { nodes: [] },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.Status).toBe('Todo');
  });

  it('handles response without content', () => {
    const response = {
      id: 'item-4',
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.id).toBe('item-4');
    expect(result.title).toBeUndefined();
    expect(result.labels).toBeUndefined();
  });

  it('handles response without fieldValues', () => {
    const response = {
      id: 'item-5',
      content: {
        title: 'No fields',
        state: 'open',
        labels: { nodes: [] },
        assignees: { nodes: [] },
      },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.id).toBe('item-5');
    expect(result.title).toBe('No fields');
  });

  it('handles content without repository', () => {
    const response = {
      id: 'item-6',
      content: {
        title: 'Draft item',
        labels: { nodes: [] },
        assignees: { nodes: [] },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.repository).toBeUndefined();
    expect(result.repo_owner).toBeUndefined();
  });

  it('handles content without milestone', () => {
    const response = {
      id: 'item-7',
      content: {
        title: 'No milestone',
        labels: { nodes: [] },
        assignees: { nodes: [] },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.milestone).toBeNull();
  });

  it('handles subIssues in content', () => {
    const response = {
      id: 'item-8',
      content: {
        title: 'Parent issue',
        labels: { nodes: [] },
        assignees: { nodes: [] },
        subIssues: {
          nodes: [
            { source: { number: 10, url: 'https://github.com/owner/repo/issues/10' } },
            { source: { number: 11, url: 'https://github.com/owner/repo/issues/11' } },
          ],
        },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toEqual({
      type: 'issue',
      id: '10',
      url: 'https://github.com/owner/repo/issues/10',
    });
    expect(result.links[1]).toEqual({
      type: 'issue',
      id: '11',
      url: 'https://github.com/owner/repo/issues/11',
    });
  });

  it('filters out invalid sub-issues (without source.number)', () => {
    const response = {
      id: 'item-9',
      content: {
        title: 'Parent with invalid sub',
        labels: { nodes: [] },
        assignees: { nodes: [] },
        subIssues: {
          nodes: [
            { source: { number: 10, url: 'https://github.com/owner/repo/issues/10' } },
            { source: {} }, // invalid
            { source: null }, // null source
          ],
        },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.links).toHaveLength(1);
  });

  it('handles issueType as string', () => {
    const response = {
      id: 'item-10',
      content: {
        title: 'Typed issue',
        labels: { nodes: [] },
        assignees: { nodes: [] },
        issueType: 'Bug',
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.Type).toBe('Bug');
  });

  it('handles issueType as object with name property', () => {
    const response = {
      id: 'item-11',
      content: {
        title: 'Typed issue',
        labels: { nodes: [] },
        assignees: { nodes: [] },
        issueType: { name: 'Feature' },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.Type).toBe('Feature');
  });

  it('handles fieldValues with no field property', () => {
    const response = {
      id: 'item-12',
      content: {
        title: 'Issue',
        labels: { nodes: [] },
        assignees: { nodes: [] },
      },
      fieldValues: {
        nodes: [
          { name: 'Some value' }, // no field property
          { field: { name: 'Status' }, name: 'Done' },
        ],
      },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.Status).toBe('Done');
  });

  it('handles empty subIssues.nodes', () => {
    const response = {
      id: 'item-13',
      content: {
        title: 'Issue with empty subs',
        labels: { nodes: [] },
        assignees: { nodes: [] },
        subIssues: { nodes: [] },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.links).toEqual([]);
  });

  it('constructs fallback URL for sub-issues without url', () => {
    const response = {
      id: 'item-14',
      content: {
        title: 'Parent',
        labels: { nodes: [] },
        assignees: { nodes: [] },
        repository: { name: 'my-repo', owner: { login: 'myowner' } },
        subIssues: {
          nodes: [
            { source: { number: 55 } }, // no url, should construct
          ],
        },
      },
      fieldValues: { nodes: [] },
    };

    const result = flattenGraphQLResponse(response);

    expect(result.links).toHaveLength(1);
    expect(result.links[0].url).toBe('https://github.com/myowner/my-repo/issues/55');
  });
});

// Mock localStorage for Node env
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

describe('mainScript', () => {
  const mockFetchFromCache = fetchFromCache as jest.Mock;
  const mockUpdateLocalCache = updateLocalCache as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('returns cached tasks when cache exists', async () => {
    const cachedTasks = [{ id: '1', title: 'Cached task' }];
    mockFetchFromCache.mockResolvedValue(cachedTasks);

    const result = await mainScript({
      projectID: 'proj-1',
      githubToken: 'token',
      repository: 'repo',
      repoOwner: 'owner',
    });

    expect(result).toEqual(cachedTasks);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches from GitHub when cache is empty (with projectID)', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);
    mockUpdateLocalCache.mockResolvedValue(undefined);

    const graphqlItem = {
      id: 'item-1',
      content: {
        title: 'Test Issue',
        number: 1,
        repository: { name: 'repo', owner: { login: 'owner' } },
        labels: { nodes: [] },
        assignees: { nodes: [{ login: 'dev1' }] },
        body: 'body text',
        state: 'open',
        url: 'https://github.com/owner/repo/issues/1',
        createdAt: '2024-01-01T00:00:00Z',
      },
      fieldValues: {
        nodes: [{ field: { name: 'Status' }, name: 'In Progress' }],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          node: {
            items: {
              nodes: [graphqlItem],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }),
    });

    const result = await mainScript({
      projectID: 'proj-1',
      githubToken: 'token',
      repository: 'repo',
      repoOwner: 'owner',
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Issue');
    expect(mockUpdateLocalCache).toHaveBeenCalled();
  });

  it('filters out PRs (items with mergedAt)', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);
    mockUpdateLocalCache.mockResolvedValue(undefined);

    const issue = {
      id: 'item-1',
      content: {
        title: 'Issue',
        number: 1,
        labels: { nodes: [] },
        assignees: { nodes: [] },
        state: 'open',
      },
      fieldValues: { nodes: [] },
    };
    const pr = {
      id: 'item-2',
      content: {
        title: 'PR',
        number: 2,
        mergedAt: '2024-01-01T00:00:00Z',
        labels: { nodes: [] },
        assignees: { nodes: [] },
        state: 'closed',
      },
      fieldValues: { nodes: [] },
    };
    const draft = {
      id: 'item-3',
      content: null,
      fieldValues: { nodes: [] },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          node: {
            items: {
              nodes: [issue, pr, draft],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }),
    });

    const result = await mainScript({
      projectID: 'proj-1',
      githubToken: 'token',
      repository: 'repo',
      repoOwner: 'owner',
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Issue');
  });

  it('returns empty array on fetch error', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await mainScript({
      projectID: 'proj-1',
      githubToken: 'token',
      repository: 'repo',
      repoOwner: 'owner',
    });

    expect(result).toEqual([]);
  });

  it('handles HTTP error responses', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const result = await mainScript({
      projectID: 'proj-1',
      githubToken: 'bad-token',
      repository: 'repo',
      repoOwner: 'owner',
    });

    expect(result).toEqual([]);
  });

  it('handles GraphQL errors', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        errors: [{ message: 'Rate limited' }],
      }),
    });

    const result = await mainScript({
      projectID: 'proj-1',
      githubToken: 'token',
      repository: 'repo',
      repoOwner: 'owner',
    });

    expect(result).toEqual([]);
  });
});
