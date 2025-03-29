import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js";

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

export const ReviewerPieCharts = ({ flattenedData, styleOptions, searchTerm }) => {
  const [chartOptions, setChartOptions] = useState(pieChartTemplate);

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptions(pieChartTemplate);
      return;
    }

    const pieData = createReviewerPieChartData(flattenedData);
    
    // Filter data based on search term
    const filteredData = searchTerm
      ? pieData.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : pieData;
    
    const options = JSON.parse(JSON.stringify(pieChartTemplate));
    options.title = {
      text: 'Review Comments by Reviewer',
      left: 'center',
      textStyle: {
        color: '#ffffff'
      }
    };
    options.series = [{
      type: 'pie',
      radius: '50%',
      data: filteredData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }];

    setChartOptions(options);
  }, [flattenedData, searchTerm]);

  return (
    <Box>
      <ECharts option={chartOptions} style={styleOptions} />
    </Box>
  );
}; 