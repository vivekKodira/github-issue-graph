import { ECharts } from "./ECharts";
import { useState, useEffect, useRef } from "react";
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { Box, HStack } from "@chakra-ui/react";
import { Insight } from './types';
import { ChartDropdown } from './ChartDropdown';
import { ErrorBoundary } from "./ErrorBoundary";
import { AverageByPersonTable } from "./AverageByPersonTable";
import { createAuthorLineChartData } from '@/util/chartDataGenerators/authorLineChartData';

export { createAuthorLineChartData } from '@/util/chartDataGenerators/authorLineChartData';

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
  const [averages, setAverages] = useState<Record<string, number>>({});
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({ start: 0, end: 100 });
  const chartRef = useRef<{ getEchartsInstance: () => unknown }>(null);

  const prs = flattenedData ?? [];
  const filteredData = prs;

  useEffect(() => {
    if (!filteredData?.length) {
      setChartOptions(createEmptyChartOptions());
      if (onInsightsGenerated) {
        onInsightsGenerated([]);
      }
      return;
    }

    const { months, authorSeries } = createAuthorLineChartData(filteredData);
    
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
          const hasPRsInCurrentMonth = filteredData.some(pr => {
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
    
    // Preselect all authors if none selected
    if (authors.length > 0 && selectedAuthors.length === 0) {
      setSelectedAuthors(authors);
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
    if (selectedAuthors.length === 0 || !filteredData?.length) return;
    
    const { months, authorSeries } = createAuthorLineChartData(filteredData);
    const selectedSeries = authorSeries.filter(series => selectedAuthors.includes(String(series.name)));
    
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
  }, [selectedAuthors, filteredData, zoomRange]);

  const handleAuthorChange = (values: string[]) => {
    setSelectedAuthors(values);
  };

  return (
    <HStack align="flex-start">
      <Box flex={1}>
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
          title="Select authors"
          options={availableAuthors}
          selectedValues={selectedAuthors}
          onSelectionChange={handleAuthorChange}
          multiple
          placeholder="Select authors"
        />
        <Box w="100%" h="350px">
          <ErrorBoundary chartName="Author Line">
            <ECharts ref={chartRef} option={chartOptions} style={styleOptions} />
          </ErrorBoundary>
        </Box>
      </Box>
      <AverageByPersonTable
        personLabel="Author"
        valueLabel="Avg Comments"
        averages={averages}
        title="Comments Received by Authors"
      />
    </HStack>
  );
}; 