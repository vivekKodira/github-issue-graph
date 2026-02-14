import { createAuthorLineChartData } from './authorLineChartData';
import { createMockPR } from '@/test/fixtures';

describe('createAuthorLineChartData', () => {
  it('returns empty arrays for empty input', () => {
    const result = createAuthorLineChartData([]);
    expect(result.months).toEqual([]);
    expect(result.authorSeries).toEqual([]);
  });

  it('skips PRs with no review comments', () => {
    const prs = [createMockPR({ reviewComments: [] })];
    const result = createAuthorLineChartData(prs as any);
    expect(result.authorSeries).toEqual([]);
  });

  it('counts comments received by PR author (skips self-comments)', () => {
    const prs = [createMockPR({
      author: 'author1',
      createdAt: '2024-01-15T00:00:00Z',
      reviewComments: [
        { body: 'Good', createdAt: '2024-01-15T12:00:00Z', author: 'reviewer1', path: 'a.ts', position: 1 },
        { body: 'Self', createdAt: '2024-01-15T12:00:00Z', author: 'author1', path: 'a.ts', position: 1 },
      ],
    })];
    const result = createAuthorLineChartData(prs as any);
    expect(result.authorSeries.length).toBe(1);
    expect(result.authorSeries[0].name).toBe('author1');
    expect(result.authorSeries[0].data).toEqual([1]);
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
    const result = createAuthorLineChartData(prs as any);
    expect(result.months).toEqual(['2024-01', '2024-02']);
  });

  it('sorts months chronologically', () => {
    const prs = [
      createMockPR({
        author: 'author1',
        createdAt: '2024-03-01T00:00:00Z',
        reviewComments: [{ body: 'A', createdAt: '2024-03-01T12:00:00Z', author: 'r1', path: 'a.ts', position: 1 }],
      }),
      createMockPR({
        author: 'author1',
        createdAt: '2024-01-01T00:00:00Z',
        reviewComments: [{ body: 'B', createdAt: '2024-01-01T12:00:00Z', author: 'r1', path: 'a.ts', position: 1 }],
      }),
    ];
    const result = createAuthorLineChartData(prs as any);
    expect(result.months[0]).toBe('2024-01');
    expect(result.months[1]).toBe('2024-03');
  });
});
