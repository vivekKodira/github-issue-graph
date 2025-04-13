import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { Box } from "@chakra-ui/react";
import { TaskFormat } from '@/util/taskConverter';
import { Insight } from './types';

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
  additions: number;
  deletions: number;
  changedFiles: number;
}

interface ReviewerData {
  reviewer: string;
  tasks: TaskFormat[];
}

export const createReviewerLineChartData = (prs: PullRequest[]) => {
  const timeData: Record<string, Record<string, number>> = {};
  const reviewerData: Record<string, boolean> = {};

  // Initialize data structures
  prs.forEach((pr) => {
    if (!pr.reviews || pr.reviews.length === 0) {
      return; // Skip PRs with no reviews
    }

    // Get the month from the PR creation date
    const prDate = new Date(pr.createdAt);
    const monthKey = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;

    // Process reviews
    pr.reviews.forEach((review) => {
      // Track reviewer
      reviewerData[review.author] = true;
      if (!timeData[monthKey]) {
        timeData[monthKey] = {};
      }
      if (!timeData[monthKey][review.author]) {
        timeData[monthKey][review.author] = 0;
      }
      timeData[monthKey][review.author]++;
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

const createEmptyChartOptions = (): EChartsOption => ({
  title: {
    text: "No Data Available",
    left: "center",
    textStyle: {
      color: '#ffffff'
    }
  },
  xAxis: {
    type: "category",
    data: [],
    axisLabel: {
      color: '#ffffff'
    }
  },
  yAxis: {
    type: "value",
    name: "Number of Comments",
    axisLabel: {
      color: '#ffffff'
    }
  },
  series: [{
    type: "line",
    data: []
  }] as LineSeriesOption[]
});

export const ReviewerLineCharts = ({ prs, styleOptions, searchTerm, onInsightsGenerated }) => {
  const [chartOptionsArray, setChartOptionsArray] = useState<EChartsOption[]>([]);
  const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);

  useEffect(() => {
    if (!prs?.length) {
      setChartOptionsArray([createEmptyChartOptions()]);
      if (onInsightsGenerated) {
        onInsightsGenerated([]);
      }
      return;
    }

    const { months, reviewerSeries } = createReviewerLineChartData(prs);
    
    // Generate insights from chart data
    const insights: Insight[] = [];
    reviewerSeries.forEach(series => {
      const data = series.data;
      if (data.length >= 2) {
        const currentValue = data[data.length - 1];
        const previousValue = data[data.length - 2];
        const currentMonth = months[months.length - 1];
        const previousMonth = months[months.length - 2];

        if (currentValue < previousValue) {
          const decrease = ((previousValue - currentValue) / previousValue * 100).toFixed(1);
          // Calculate severity based on percentage decrease
          const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20))); // -1 to -5 based on 20% intervals
          insights.push({
            text: `${series.name} gave ${decrease}% fewer comments in ${currentMonth} compared to ${previousMonth}`,
            severity
          });
        }
      }
    });

    // Only update insights if they've changed
    if (onInsightsGenerated && JSON.stringify(insights) !== JSON.stringify(previousInsights)) {
      onInsightsGenerated(insights);
      setPreviousInsights(insights);
    }

    // Filter reviewer series based on search term
    const filteredReviewerSeries = searchTerm
      ? reviewerSeries.filter(series => 
          String(series.name).toLowerCase().includes(searchTerm.toLowerCase())
        )
      : reviewerSeries;

    const reviewers = filteredReviewerSeries.map(series => String(series.name));

    // Create options for all reviewers chart
    const allReviewersOptions: EChartsOption = {
      title: {
        text: "Comments Given by Reviewers per Month",
        left: "center",
        top: 20,
        textStyle: { color: '#ffffff' }
      },
      tooltip: { trigger: "axis" },
      legend: {
        data: reviewers,
        top: 60,
        textStyle: { color: '#ffffff' }
      },
      grid: { top: 100 },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: '#ffffff' }
      },
      yAxis: {
        type: "value",
        name: "Number of Comments",
        axisLabel: { color: '#ffffff' }
      },
      series: filteredReviewerSeries,
    };

    // Create individual charts for reviewers
    const individualReviewerCharts: EChartsOption[] = filteredReviewerSeries.map((series) => ({
      title: {
        text: `Comments Given - ${series.name}`,
        left: "center",
        textStyle: { color: '#ffffff' }
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: '#ffffff' }
      },
      yAxis: {
        type: "value",
        name: "Number of Comments",
        axisLabel: { color: '#ffffff' }
      },
      series: [series],
    }));

    setChartOptionsArray([allReviewersOptions, ...individualReviewerCharts]);
  }, [prs, searchTerm, onInsightsGenerated, previousInsights]);

  return (
    <>
      {chartOptionsArray.map((options, index) => (
        <div key={index}>
          <ECharts option={options} style={styleOptions} />
        </div>
      ))}
    </>
  );
}; 