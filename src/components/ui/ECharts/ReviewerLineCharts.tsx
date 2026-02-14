import { ECharts } from "./ECharts";
import { useState, useEffect, useRef } from "react";
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { Box, HStack } from "@chakra-ui/react";
import { Insight } from './types';
import { ChartDropdown } from './ChartDropdown';
import { ErrorBoundary } from "./ErrorBoundary";
import { AverageByPersonTable } from "./AverageByPersonTable";
import { createReviewerLineChartData } from '@/util/chartDataGenerators/reviewerLineChartData';

export { createReviewerLineChartData } from '@/util/chartDataGenerators/reviewerLineChartData';

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

const ReviewerLineChartsContent = ({ flattenedData, styleOptions, searchTerm, onInsightsGenerated }) => {
  const [chartOptions, setChartOptions] = useState<EChartsOption>(createEmptyChartOptions());
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [availableReviewers, setAvailableReviewers] = useState<string[]>([]);
  const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);
  const [averages, setAverages] = useState<Record<string, number>>({});
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({ start: 0, end: 100 });
  const chartRef = useRef<{ getEchartsInstance: () => unknown }>(null);

  const filteredData = flattenedData ?? [];

  useEffect(() => {
    console.log('ReviewerLineCharts: flattenedData received:', flattenedData);
    if (!filteredData?.length) {
      console.log('ReviewerLineCharts: No data available');
      setChartOptions(createEmptyChartOptions());
      if (onInsightsGenerated) {
        onInsightsGenerated([]);
      }
      return;
    }

    const { months, reviewerSeries } = createReviewerLineChartData(filteredData);
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
    
    // Preselect all reviewers if none selected
    if (reviewers.length > 0 && selectedReviewers.length === 0) {
      setSelectedReviewers(reviewers);
    }
  }, [filteredData, searchTerm, onInsightsGenerated, previousInsights]);

  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance) return;
    const handler = (params: { batch?: Array<{ start?: number; end?: number }> }) => {
      const batch = params?.batch;
      const z = batch?.[0];
      if (z && typeof z.start === 'number' && typeof z.end === 'number') {
        setZoomRange({ start: z.start, end: z.end });
      }
    };
    instance.on('datazoom', handler);
    return () => { instance.off('datazoom', handler); };
  }, [chartOptions]);

  useEffect(() => {
    if (selectedReviewers.length === 0 || !filteredData?.length) return;
    
    const { months, reviewerSeries } = createReviewerLineChartData(filteredData);
    const selectedSeries = reviewerSeries.filter(series => selectedReviewers.includes(String(series.name)));
    
    if (selectedSeries.length > 0) {
      const n = months.length;
      const startIdx = Math.floor((zoomRange.start / 100) * n);
      const endIdx = Math.ceil((zoomRange.end / 100) * n);
      const avgs: Record<string, number> = {};
      selectedSeries.forEach(series => {
        const data = (series.data as number[]) || [];
        const visibleData = data.slice(startIdx, endIdx);
        avgs[String(series.name)] = visibleData.length > 0 ? visibleData.reduce((a, b) => a + b, 0) / visibleData.length : 0;
      });
      setAverages(avgs);

      const newChartOptions: EChartsOption = {
        grid: { left: '10%', right: '10%', top: '15%', bottom: '22%', containLabel: true },
        title: {
          text: '',
          left: "center",
          textStyle: { color: '#ffffff' }
        },
        tooltip: { trigger: "axis" },
        legend: {
          data: selectedSeries.map(s => String(s.name)),
          textStyle: { color: '#ffffff' }
        },
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
        dataZoom: [
          { type: 'slider', show: true, xAxisIndex: 0, start: zoomRange.start, end: zoomRange.end, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
          { type: 'inside', xAxisIndex: 0, start: zoomRange.start, end: zoomRange.end }
        ],
        series: selectedSeries,
      };
      setChartOptions(newChartOptions);
    }
  }, [selectedReviewers, filteredData, zoomRange]);

  const handleReviewerChange = (values: string[]) => {
    setSelectedReviewers(values);
  };

  return (
    <HStack align="flex-start">
      <Box flex={1}>
        <h3 style={{ 
          color: '#ffffff', 
          marginBottom: '16px',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          Comments Given by Reviewers
        </h3>
        <ChartDropdown
          title="Select reviewers"
          options={availableReviewers}
          selectedValues={selectedReviewers}
          onSelectionChange={handleReviewerChange}
          multiple
          placeholder="Select reviewers"
        />
        <Box w="100%" h="350px">
          <ECharts ref={chartRef} option={chartOptions} style={styleOptions} />
        </Box>
      </Box>
      <AverageByPersonTable
        personLabel="Reviewer"
        valueLabel="Avg Comments"
        averages={averages}
        title="Comments Given by Reviewers"
      />
    </HStack>
  );
};

export const ReviewerLineCharts = (props) => {
  return (
    <ErrorBoundary chartName="Reviewer Line">
      <ReviewerLineChartsContent {...props} />
    </ErrorBoundary>
  );
}; 