import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { LuTrendingUp } from "react-icons/lu";

interface ReviewComment {
  author: string;
  createdAt: string;
}

interface PullRequest {
  createdAt: string;
  author: string;
  reviewComments: ReviewComment[];
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

export const AuthorLineCharts = ({ flattenedData, styleOptions, searchTerm, onInsightsGenerated }) => {
  const [chartOptionsArray, setChartOptionsArray] = useState<EChartsOption[]>([createEmptyChartOptions()]);

  // Add effect for insights generation
  useEffect(() => {
    if (!flattenedData?.length) return;

    const { months, authorSeries } = createAuthorLineChartData(flattenedData);
    
    // Generate insights from chart data
    const insights = [];
    authorSeries.forEach(series => {
      const data = series.data;
      if (data.length >= 2) {
        const currentValue = data[data.length - 1];
        const previousValue = data[data.length - 2];
        const currentMonth = months[months.length - 1];
        const previousMonth = months[months.length - 2];

        if (currentValue < previousValue) {
          const decrease = ((previousValue - currentValue) / previousValue * 100).toFixed(1);
          insights.push({
            text: `${series.name} received ${decrease}% fewer comments in ${currentMonth} compared to ${previousMonth}`,
            icon: LuTrendingUp
          });
        }
      }
    });

    if (onInsightsGenerated) {
      onInsightsGenerated(insights);
    }
  }, [flattenedData, onInsightsGenerated]);

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptionsArray([createEmptyChartOptions()]);
      return;
    }

    const { months, authorSeries } = createAuthorLineChartData(flattenedData);

    // Filter author series based on search term
    const filteredAuthorSeries = searchTerm
      ? authorSeries.filter(series => 
          String(series.name).toLowerCase().includes(searchTerm.toLowerCase())
        )
      : authorSeries;

    const authors = filteredAuthorSeries.map(series => String(series.name));

    // Create options for all authors chart
    const allAuthorsOptions: EChartsOption = {
      title: {
        text: "Comments Received by Authors per Month",
        left: "center",
        top: 20,
        textStyle: { color: '#ffffff' }
      },
      tooltip: { trigger: "axis" },
      legend: {
        data: authors,
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
      series: filteredAuthorSeries,
    };

    // Create individual charts for authors
    const individualAuthorCharts: EChartsOption[] = filteredAuthorSeries.map((series) => ({
      title: {
        text: `Comments Received - ${series.name}`,
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

    setChartOptionsArray([allAuthorsOptions, ...individualAuthorCharts]);
  }, [flattenedData, searchTerm]);

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