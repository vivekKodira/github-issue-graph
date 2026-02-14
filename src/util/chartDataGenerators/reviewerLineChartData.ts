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
  reviewComments: ReviewComment[];
  additions: number;
  deletions: number;
  changedFiles: number;
}

export const createReviewerLineChartData = (prs: PullRequest[]) => {
  const timeData: Record<string, Record<string, number>> = {};
  const reviewerData: Record<string, boolean> = {};

  // Initialize data structures
  prs.forEach((pr) => {
    if (!pr.reviewComments || pr.reviewComments.length === 0) {
      return; // Skip PRs with no review comments
    }

    // Get the month from the PR creation date
    const prDate = new Date(pr.createdAt);
    const monthKey = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;

    // Process review comments
    pr.reviewComments.forEach((comment) => {
      // Skip comments from the PR author
      if (comment.author === pr.author) {
        return;
      }

      // Track reviewer
      reviewerData[comment.author] = true;
      if (!timeData[monthKey]) {
        timeData[monthKey] = {};
      }
      if (!timeData[monthKey][comment.author]) {
        timeData[monthKey][comment.author] = 0;
      }
      timeData[monthKey][comment.author]++;
    });
  });

  // Sort months
  const months = Object.keys(timeData).sort();
  const reviewers = Object.keys(reviewerData);

  // Create series data for reviewers
  const reviewerSeries: LineSeriesOption[] = reviewers.map((reviewer) => ({
    name: reviewer,
    type: "line",
    data: months.map((month) => timeData[month][reviewer] || 0),
  }));

  return {
    months,
    reviewerSeries,
  };
};
