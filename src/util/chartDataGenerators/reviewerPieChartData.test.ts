import { createReviewerPieChartData } from './reviewerPieChartData';
import { createMockPR } from '@/test/fixtures';

describe('createReviewerPieChartData', () => {
  it('returns empty array for empty input', () => {
    const result = createReviewerPieChartData([]);
    expect(result).toEqual([]);
  });

  it('skips PRs with no review comments', () => {
    const prs = [createMockPR({ reviewComments: [] })];
    const result = createReviewerPieChartData(prs as any);
    expect(result).toEqual([]);
  });

  it('skips self-comments', () => {
    const prs = [createMockPR({
      author: 'author1',
      reviewComments: [
        { author: 'author1', createdAt: '2024-01-15T12:00:00Z' },
      ],
    })];
    const result = createReviewerPieChartData(prs as any);
    expect(result).toEqual([]);
  });

  it('counts review comments per reviewer', () => {
    const prs = [createMockPR({
      author: 'author1',
      reviewComments: [
        { author: 'reviewer1', createdAt: '2024-01-15T12:00:00Z' },
        { author: 'reviewer1', createdAt: '2024-01-15T13:00:00Z' },
        { author: 'reviewer2', createdAt: '2024-01-15T14:00:00Z' },
      ],
    })];
    const result = createReviewerPieChartData(prs as any);
    expect(result.length).toBe(2);
    const r1 = result.find(r => r.name === 'reviewer1');
    expect(r1?.value).toBe(2);
    const r2 = result.find(r => r.name === 'reviewer2');
    expect(r2?.value).toBe(1);
  });

  it('aggregates across multiple PRs', () => {
    const prs = [
      createMockPR({
        author: 'author1',
        reviewComments: [
          { author: 'reviewer1', createdAt: '2024-01-15T12:00:00Z' },
        ],
      }),
      createMockPR({
        author: 'author2',
        reviewComments: [
          { author: 'reviewer1', createdAt: '2024-02-15T12:00:00Z' },
        ],
      }),
    ];
    const result = createReviewerPieChartData(prs as any);
    const r1 = result.find(r => r.name === 'reviewer1');
    expect(r1?.value).toBe(2);
  });
});
