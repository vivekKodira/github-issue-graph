import { createReviewerLineChartData } from './reviewerLineChartData';
import { createMockPR } from '@/test/fixtures';

describe('createReviewerLineChartData', () => {
  it('returns empty arrays for empty input', () => {
    const result = createReviewerLineChartData([]);
    expect(result.months).toEqual([]);
    expect(result.reviewerSeries).toEqual([]);
  });

  it('skips PRs with no review comments', () => {
    const prs = [createMockPR({ reviewComments: [] })];
    const result = createReviewerLineChartData(prs as any);
    expect(result.reviewerSeries).toEqual([]);
  });

  it('counts comments given by reviewers (skips self-comments)', () => {
    const prs = [createMockPR({
      author: 'author1',
      createdAt: '2024-01-15T00:00:00Z',
      reviewComments: [
        { body: 'Good', createdAt: '2024-01-15T12:00:00Z', author: 'reviewer1', path: 'a.ts', position: 1 },
        { body: 'Self', createdAt: '2024-01-15T12:00:00Z', author: 'author1', path: 'a.ts', position: 1 },
      ],
    })];
    const result = createReviewerLineChartData(prs as any);
    expect(result.reviewerSeries.length).toBe(1);
    expect(result.reviewerSeries[0].name).toBe('reviewer1');
    expect(result.reviewerSeries[0].data).toEqual([1]);
  });

  it('buckets by month', () => {
    const prs = [
      createMockPR({
        author: 'author1',
        createdAt: '2024-01-15T00:00:00Z',
        reviewComments: [
          { body: 'A', createdAt: '2024-01-15T12:00:00Z', author: 'reviewer1', path: 'a.ts', position: 1 },
        ],
      }),
      createMockPR({
        author: 'author1',
        createdAt: '2024-02-15T00:00:00Z',
        reviewComments: [
          { body: 'B', createdAt: '2024-02-15T12:00:00Z', author: 'reviewer1', path: 'a.ts', position: 1 },
        ],
      }),
    ];
    const result = createReviewerLineChartData(prs as any);
    expect(result.months).toEqual(['2024-01', '2024-02']);
  });

  it('tracks multiple reviewers independently', () => {
    const prs = [createMockPR({
      author: 'author1',
      createdAt: '2024-01-15T00:00:00Z',
      reviewComments: [
        { body: 'A', createdAt: '2024-01-15T12:00:00Z', author: 'reviewer1', path: 'a.ts', position: 1 },
        { body: 'B', createdAt: '2024-01-15T12:00:00Z', author: 'reviewer2', path: 'a.ts', position: 1 },
      ],
    })];
    const result = createReviewerLineChartData(prs as any);
    expect(result.reviewerSeries.length).toBe(2);
  });
});
