import type { LineSeriesOption } from 'echarts';

interface ReviewComment {
  body: string;
  createdAt: string;
  author: string;
  path: string;
  position: number;
}

interface PullRequest {
  id: string;
  title: string;
  number: number;
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  state: string;
  body: string;
  author: string;
  assignees: string[];
  labels: string[];
  reviews: {
    state: string;
    author: string;
    comments: ReviewComment[];
  }[];
  reviewComments?: ReviewComment[];
  additions: number;
  deletions: number;
  changedFiles: number;
}

export const createAuthorLineChartData = (prs: PullRequest[]) => {
  const timeData: Record<string, Record<string, number>> = {};
  const authorData: Record<string, boolean> = {};

  // Initialize data structures
  prs.forEach((pr) => {
    if (!pr.reviewComments || pr.reviewComments.length === 0) {
      return; // Skip PRs with no review comments
    }

    // Get the month from the PR creation date
    const prDate = new Date(pr.createdAt);
    const monthKey = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;

    // Track PR author
    authorData[pr.author] = true;
    if (!timeData[monthKey]) {
      timeData[monthKey] = {};
    }
    if (!timeData[monthKey][pr.author]) {
      timeData[monthKey][pr.author] = 0;
    }

    // Count comments received by PR author
    pr.reviewComments.forEach((comment) => {
      if (comment.author !== pr.author) {
        timeData[monthKey][pr.author]++;
      }
    });
  });

  // Sort months
  const months = Object.keys(timeData).sort();
  const authors = Object.keys(authorData);

  // Create series data for authors
  const authorSeries: LineSeriesOption[] = authors.map((author) => ({
    name: author,
    type: "line",
    data: months.map((month) => timeData[month][author] || 0),
  }));

  return {
    months,
    authorSeries,
  };
};
