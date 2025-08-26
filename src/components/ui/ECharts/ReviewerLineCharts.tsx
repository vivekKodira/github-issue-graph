import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { Box } from "@chakra-ui/react";
import { Insight } from './types';
import { ChartDropdown } from './ChartDropdown';
import { ErrorBoundary } from "./ErrorBoundary";

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

export const ReviewerLineCharts = ({ flattenedData, styleOptions, searchTerm, onInsightsGenerated }) => {
  const [chartOptions, setChartOptions] = useState<EChartsOption>(createEmptyChartOptions());
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [availableReviewers, setAvailableReviewers] = useState<string[]>([]);
  const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);

  useEffect(() => {
    console.log('ReviewerLineCharts: flattenedData received:', flattenedData);
    if (!flattenedData?.length) {
      console.log('ReviewerLineCharts: No data available');
      setChartOptions(createEmptyChartOptions());
      if (onInsightsGenerated) {
        onInsightsGenerated([]);
      }
      return;
    }

    const { months, reviewerSeries } = createReviewerLineChartData(flattenedData);
    console.log('ReviewerLineCharts: Processed data:', { months, reviewerSeries });
    
    // Generate insights from chart data
    const insights: Insight[] = [];
    reviewerSeries.forEach(series => {
      const data = series.data as number[];
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
    console.log('ReviewerLineCharts: Available reviewers:', reviewers);
    setAvailableReviewers(reviewers);
    
    // Set first reviewer as default if none selected
    if (reviewers.length > 0 && selectedReviewers.length === 0) {
      console.log('ReviewerLineCharts: Setting default reviewer:', reviewers[0]);
      setSelectedReviewers([reviewers[0]]);
    }
  }, [flattenedData, searchTerm, onInsightsGenerated, previousInsights]);

  useEffect(() => {
    if (selectedReviewers.length === 0 || !flattenedData?.length) return;
    
    const { months, reviewerSeries } = createReviewerLineChartData(flattenedData);
    const selectedSeries = reviewerSeries.filter(series => selectedReviewers.includes(String(series.name)));
    
    if (selectedSeries.length > 0) {
      const newChartOptions: EChartsOption = {
        title: {
          text: '',
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
        series: selectedSeries,
      };
      setChartOptions(newChartOptions);
    }
  }, [selectedReviewers, flattenedData]);

  const handleReviewerChange = (values: string[]) => {
    setSelectedReviewers(values);
  };

  return (
    <Box>
      <h3 style={{ 
        color: '#ffffff', 
        marginBottom: '16px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Comments Given by Reviewers
      </h3>
      <ChartDropdown
        title="Select reviewer"
        options={availableReviewers}
        selectedValues={selectedReviewers}
        onSelectionChange={handleReviewerChange}
        multiple={false}
        placeholder="Select a reviewer"
      />
      <Box w="100%" h="350px">
        <ErrorBoundary chartName="Reviewer Line">
          <ECharts option={chartOptions} style={styleOptions} />
        </ErrorBoundary>
      </Box>
    </Box>
  );
}; 