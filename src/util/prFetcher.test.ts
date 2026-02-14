// Mock dependencies before imports
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));
jest.mock('./renderDebugLog', () => ({
  appendRenderLog: jest.fn(),
}));
jest.mock('./commonFunctions.js', () => ({
  fetchFromCache: jest.fn(),
  updateLocalCache: jest.fn(),
}));
jest.mock('./github-pr-query.js', () => ({
  prQuery: 'mocked-pr-query',
}));

import { flattenPRResponse } from './prFetcher';
import fetchPRs from './prFetcher';
import { fetchFromCache, updateLocalCache } from './commonFunctions.js';

function makePR(overrides: any = {}) {
  return {
    id: 'PR_123',
    title: 'Test PR',
    number: 42,
    createdAt: '2024-01-15T10:00:00Z',
    closedAt: null,
    mergedAt: null,
    state: 'OPEN',
    body: 'PR body text',
    author: { login: 'author1' },
    assignees: { nodes: [{ login: 'assignee1' }, { login: 'assignee2' }] },
    labels: { nodes: [{ name: 'bug', color: 'ff0000' }, { name: 'urgent', color: '00ff00' }] },
    reviews: {
      nodes: [
        {
          state: 'APPROVED',
          author: { login: 'reviewer1' },
          comments: {
            nodes: [
              {
                body: 'Looks good!',
                createdAt: '2024-01-16T10:00:00Z',
                author: { login: 'reviewer1' },
                path: 'src/app.ts',
                position: 10,
              },
            ],
          },
        },
        {
          state: 'CHANGES_REQUESTED',
          author: { login: 'reviewer2' },
          comments: {
            nodes: [
              {
                body: 'Please fix this',
                createdAt: '2024-01-16T11:00:00Z',
                author: { login: 'reviewer2' },
                path: 'src/utils.ts',
                position: 5,
              },
              {
                body: 'And this too',
                createdAt: '2024-01-16T12:00:00Z',
                author: { login: 'reviewer2' },
                path: 'src/utils.ts',
                position: 20,
              },
            ],
          },
        },
      ],
    },
    additions: 50,
    deletions: 10,
    changedFiles: 3,
    ...overrides,
  };
}

describe('flattenPRResponse', () => {
  it('flattens a complete PR response', () => {
    const pr = makePR();
    const result = flattenPRResponse(pr);

    expect(result.id).toBe('PR_123');
    expect(result.title).toBe('Test PR');
    expect(result.number).toBe(42);
    expect(result.createdAt).toBe('2024-01-15T10:00:00Z');
    expect(result.closedAt).toBeNull();
    expect(result.mergedAt).toBeNull();
    expect(result.state).toBe('OPEN');
    expect(result.body).toBe('PR body text');
    expect(result.author).toBe('author1');
    expect(result.additions).toBe(50);
    expect(result.deletions).toBe(10);
    expect(result.changedFiles).toBe(3);
  });

  it('extracts assignee logins', () => {
    const pr = makePR();
    const result = flattenPRResponse(pr);

    expect(result.assignees).toEqual(['assignee1', 'assignee2']);
  });

  it('keeps labels as objects with name and color', () => {
    const pr = makePR();
    const result = flattenPRResponse(pr);

    expect(result.labels).toEqual([
      { name: 'bug', color: 'ff0000' },
      { name: 'urgent', color: '00ff00' },
    ]);
  });

  it('extracts reviewer logins', () => {
    const pr = makePR();
    const result = flattenPRResponse(pr);

    expect(result.reviewers).toEqual(['reviewer1', 'reviewer2']);
  });

  it('extracts review states', () => {
    const pr = makePR();
    const result = flattenPRResponse(pr);

    expect(result.reviewStates).toEqual(['APPROVED', 'CHANGES_REQUESTED']);
  });

  it('flattens review comments across reviews', () => {
    const pr = makePR();
    const result = flattenPRResponse(pr);

    expect(result.reviewComments).toHaveLength(3);

    expect(result.reviewComments[0]).toEqual({
      body: 'Looks good!',
      createdAt: '2024-01-16T10:00:00Z',
      author: 'reviewer1',
      path: 'src/app.ts',
      position: 10,
      reviewState: 'APPROVED',
      reviewAuthor: 'reviewer1',
    });

    expect(result.reviewComments[1]).toEqual({
      body: 'Please fix this',
      createdAt: '2024-01-16T11:00:00Z',
      author: 'reviewer2',
      path: 'src/utils.ts',
      position: 5,
      reviewState: 'CHANGES_REQUESTED',
      reviewAuthor: 'reviewer2',
    });
  });

  it('handles PR with no reviews', () => {
    const pr = makePR({ reviews: { nodes: [] } });
    const result = flattenPRResponse(pr);

    expect(result.reviewers).toEqual([]);
    expect(result.reviewStates).toEqual([]);
    expect(result.reviewComments).toEqual([]);
  });

  it('handles PR with no assignees', () => {
    const pr = makePR({ assignees: { nodes: [] } });
    const result = flattenPRResponse(pr);

    expect(result.assignees).toEqual([]);
  });

  it('handles merged PR', () => {
    const pr = makePR({
      state: 'MERGED',
      mergedAt: '2024-01-20T10:00:00Z',
      closedAt: '2024-01-20T10:00:00Z',
    });
    const result = flattenPRResponse(pr);

    expect(result.state).toBe('MERGED');
    expect(result.mergedAt).toBe('2024-01-20T10:00:00Z');
    expect(result.closedAt).toBe('2024-01-20T10:00:00Z');
  });

  it('handles reviews with empty comments', () => {
    const pr = makePR({
      reviews: {
        nodes: [
          {
            state: 'APPROVED',
            author: { login: 'reviewer1' },
            comments: { nodes: [] },
          },
        ],
      },
    });
    const result = flattenPRResponse(pr);

    expect(result.reviewers).toEqual(['reviewer1']);
    expect(result.reviewComments).toEqual([]);
  });
});

describe('fetchPRs', () => {
  const mockFetchFromCache = fetchFromCache as jest.Mock;
  const mockUpdateLocalCache = updateLocalCache as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('returns cached PRs when cache exists', async () => {
    const cachedData = [{ id: 'cached-pr', title: 'Cached PR' }];
    mockFetchFromCache.mockResolvedValue(cachedData);

    const result = await fetchPRs({
      repoOwner: 'owner',
      repository: 'repo',
      githubToken: 'token',
    });

    expect(result).toEqual(cachedData);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches from GitHub API when cache is empty', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);
    mockUpdateLocalCache.mockResolvedValue(undefined);

    const prNode = makePR();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          repository: {
            pullRequests: {
              totalCount: 1,
              nodes: [prNode],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }),
    });

    const result = await fetchPRs({
      repoOwner: 'owner',
      repository: 'repo',
      githubToken: 'token',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('PR_123');
    expect(result[0].author).toBe('author1');
    expect(mockUpdateLocalCache).toHaveBeenCalled();
  });

  it('returns empty array on fetch error', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await fetchPRs({
      repoOwner: 'owner',
      repository: 'repo',
      githubToken: 'token',
    });

    expect(result).toEqual([]);
  });

  it('handles GraphQL errors gracefully', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        errors: [{ message: 'Something went wrong' }],
      }),
    });

    const result = await fetchPRs({
      repoOwner: 'owner',
      repository: 'repo',
      githubToken: 'token',
    });

    expect(result).toHaveLength(0);
  });

  it('handles HTTP error responses', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const result = await fetchPRs({
      repoOwner: 'owner',
      repository: 'repo',
      githubToken: 'bad-token',
    });

    expect(result).toEqual([]);
  });

  it('paginates through multiple pages', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);
    mockUpdateLocalCache.mockResolvedValue(undefined);

    const pr1 = makePR({ id: 'PR_1', title: 'PR 1' });
    const pr2 = makePR({ id: 'PR_2', title: 'PR 2' });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequests: {
                totalCount: 2,
                nodes: [pr1],
                pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequests: {
                totalCount: 2,
                nodes: [pr2],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        }),
      });

    const result = await fetchPRs({
      repoOwner: 'owner',
      repository: 'repo',
      githubToken: 'token',
    });

    expect(result).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('calls onProgress callback', async () => {
    mockFetchFromCache.mockResolvedValue(undefined);
    mockUpdateLocalCache.mockResolvedValue(undefined);

    const prNode = makePR();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          repository: {
            pullRequests: {
              totalCount: 1,
              nodes: [prNode],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }),
    });

    const onProgress = jest.fn();
    await fetchPRs({
      repoOwner: 'owner',
      repository: 'repo',
      githubToken: 'token',
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith(1, 1);
  });
});
