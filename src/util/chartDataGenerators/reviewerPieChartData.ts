interface ReviewComment {
  author: string;
  createdAt: string;
}

interface PullRequest {
  createdAt: string;
  author: string;
  reviewComments: ReviewComment[];
}

export const createReviewerPieChartData = (prs: PullRequest[]) => {
  const reviewerData: Record<string, number> = {};

  prs.forEach((pr) => {
    if (!pr.reviewComments || pr.reviewComments.length === 0) {
      return; // Skip PRs with no review comments
    }

    // Process review comments
    pr.reviewComments.forEach((comment) => {
      // Skip comments from the PR author
      if (comment.author === pr.author) {
        return;
      }

      if (!reviewerData[comment.author]) {
        reviewerData[comment.author] = 0;
      }
      reviewerData[comment.author]++;
    });
  });

  // Convert to series data format
  return Object.entries(reviewerData).map(([reviewer, count]) => ({
    name: reviewer,
    value: count
  }));
};
