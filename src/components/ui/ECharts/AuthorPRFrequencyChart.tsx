import { ECharts } from "./ECharts";
import { useState, useEffect, useRef } from "react";
import { Box, HStack } from "@chakra-ui/react";
import { ChartDropdown } from "./ChartDropdown";
import { ErrorBoundary } from "./ErrorBoundary";
import { AverageByPersonTable } from "./AverageByPersonTable";

// Accepts: prs (array of PRs), styleOptions (for ECharts)
export const AuthorPRFrequencyChart = ({ prs, styleOptions }) => {
  const [chartOptions, setChartOptions] = useState(null);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [allAuthors, setAllAuthors] = useState([]);
  const [averages, setAverages] = useState({});
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 100 });
  const chartRef = useRef(null);

  useEffect(() => {
    if (!prs?.length) return;

    // Group PRs by author and month
    const freqData = {};
    const allMonths = new Set();
    prs.forEach(pr => {
      const author = pr.author || "Unknown";
      const date = new Date(pr.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      allMonths.add(monthKey);
      if (!freqData[author]) freqData[author] = {};
      freqData[author][monthKey] = (freqData[author][monthKey] || 0) + 1;
    });
    const months = Array.from(allMonths).sort();
    const authors = Object.keys(freqData);
    // Only update allAuthors if it changed to prevent unnecessary re-renders
    setAllAuthors(prev => {
      const hasChanged = prev.length !== authors.length ||
        !prev.every((a, i) => a === authors[i]);
      return hasChanged ? authors : prev;
    });
    // Preselect all authors if none selected
    if (authors.length > 0 && selectedAuthors.length === 0) {
      setSelectedAuthors(authors);
    }
    // Only show selected authors
    const filteredAuthors = selectedAuthors.length > 0 ? selectedAuthors : authors;
    const series = filteredAuthors.map(author => ({
      name: author,
      type: "line",
      data: months.map(month => freqData[author]?.[month] || 0),
    }));

    const n = months.length;
    const startIdx = Math.floor((zoomRange.start / 100) * n);
    const endIdx = Math.ceil((zoomRange.end / 100) * n);
    const avgs = {};
    filteredAuthors.forEach(author => {
      const values = months.map(m => freqData[author]?.[m] || 0).slice(startIdx, endIdx).filter(v => v > 0);
      avgs[author] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });
    setAverages(avgs);

    setChartOptions({
      grid: { left: '10%', right: '10%', top: '15%', bottom: '22%', containLabel: true },
      tooltip: { trigger: "axis" },
      legend: {
        data: filteredAuthors,
        textStyle: { color: '#ffffff' }
      },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: '#ffffff' }
      },
      yAxis: {
        type: "value",
        name: "PRs Submitted",
        axisLabel: { color: '#ffffff' }
      },
      dataZoom: [
        { type: 'slider', show: true, xAxisIndex: 0, start: zoomRange.start, end: zoomRange.end, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
        { type: 'inside', xAxisIndex: 0, start: zoomRange.start, end: zoomRange.end }
      ],
      series,
    });
  }, [prs, selectedAuthors, zoomRange]);

  useEffect(() => {
    if (!chartOptions) return;
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance) return;
    const handler = (params) => {
      const batch = params?.batch;
      const z = batch?.[0];
      if (z && typeof z.start === 'number' && typeof z.end === 'number') {
        setZoomRange({ start: z.start, end: z.end });
      }
    };
    instance.on('datazoom', handler);
    return () => { instance.off('datazoom', handler); };
  }, [chartOptions]);

  return (
    <HStack align="flex-start">
      <Box flex={1}>
        <h3 style={{ color: '#ffffff', marginTop: '32px', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
          PR Submission Frequency by Author
        </h3>
        <ChartDropdown
          title="Select authors"
          options={allAuthors}
          selectedValues={selectedAuthors}
          onSelectionChange={setSelectedAuthors}
          multiple
          placeholder="Select authors"
        />
        <Box w="100%" h="350px">
          {chartOptions && (
            <ErrorBoundary chartName="Author PR Frequency">
              <ECharts ref={chartRef} option={chartOptions} style={styleOptions} />
            </ErrorBoundary>
          )}
        </Box>
      </Box>
      <AverageByPersonTable
        personLabel="Author"
        valueLabel="Avg PRs"
        averages={averages}
        title="PR Submission Frequency by Author"
      />
    </HStack>
  );
}; 