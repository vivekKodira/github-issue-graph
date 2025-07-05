import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { Box } from "@chakra-ui/react";
import { Insight } from './types';
import { ChartDropdown } from './ChartDropdown';

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

const formatMonthName = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export const AuthorLineCharts = ({ flattenedData, styleOptions, searchTerm, onInsightsGenerated }) => {
  const [chartOptions, setChartOptions] = useState<EChartsOption>(createEmptyChartOptions());
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);
  const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptions(createEmptyChartOptions());
      if (onInsightsGenerated) {
        onInsightsGenerated([]);
      }
      return;
    }

    const { months, authorSeries } = createAuthorLineChartData(flattenedData);
    
    // Generate insights from chart data
    const insights: Insight[] = [];
    authorSeries.forEach(series => {
      const data = series.data;
      if (data.length >= 2) {
        const currentValue = data[data.length - 1];
        const previousValue = data[data.length - 2];
        const currentMonth = months[months.length - 1];
        const previousMonth = months[months.length - 2];

        if (currentValue < previousValue) {
          const decrease = ((previousValue - currentValue) / previousValue * 100).toFixed(1);
          // Calculate severity based on percentage decrease
          const decreaseNumber = parseFloat(decrease);
          const severity = Math.min(5, Math.max(1, Math.floor(decreaseNumber / 20))); // -1 to -5 based on 20% intervals
          
          // Only add insight if the developer has PRs in the current month
          const hasPRsInCurrentMonth = flattenedData.some(pr => {
            const prDate = new Date(pr.createdAt);
            const prMonth = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;
            return prMonth === currentMonth && pr.author === series.name;
          });

          if (hasPRsInCurrentMonth) {
            insights.push({
              text: `${series.name} received ${decrease}% fewer comments in ${formatMonthName(currentMonth)} compared to ${formatMonthName(previousMonth)}`,
              severity
            });
          }
        }
      }
    });

    // Only update insights if they've changed
    if (onInsightsGenerated && JSON.stringify(insights) !== JSON.stringify(previousInsights)) {
      onInsightsGenerated(insights);
      setPreviousInsights(insights);
    }

    // Filter author series based on search term
    const filteredAuthorSeries = searchTerm
      ? authorSeries.filter(series => 
          String(series.name).toLowerCase().includes(searchTerm.toLowerCase())
        )
      : authorSeries;

    const authors = filteredAuthorSeries.map(series => String(series.name));
    setAvailableAuthors(authors);
    
    // Set first author as default if none selected
    if (authors.length > 0 && selectedAuthors.length === 0) {
      setSelectedAuthors([authors[0]]);
    }
  }, [flattenedData, searchTerm, onInsightsGenerated, previousInsights]);

  useEffect(() => {
    if (selectedAuthors.length === 0 || !flattenedData?.length) return;
    
    const { months, authorSeries } = createAuthorLineChartData(flattenedData);
    const selectedSeries = authorSeries.filter(series => selectedAuthors.includes(String(series.name)));
    
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
  }, [selectedAuthors, flattenedData]);

  const handleAuthorChange = (values: string[]) => {
    setSelectedAuthors(values);
  };

  return (
    <Box>
      <h3 style={{ 
        color: '#ffffff', 
        marginTop: '32px',
        marginBottom: '16px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Comments Received by Authors
      </h3>
      <ChartDropdown
        title="Select author"
        options={availableAuthors}
        selectedValues={selectedAuthors}
        onSelectionChange={handleAuthorChange}
        multiple={false}
        placeholder="Select an author"
      />
      <Box w="100%" h="350px">
        <ECharts option={chartOptions} style={styleOptions} />
      </Box>
    </Box>
  );
}; 