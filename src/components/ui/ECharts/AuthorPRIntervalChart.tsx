import { ECharts } from "./ECharts";
import { useState, useEffect, useRef } from "react";
import { Box, HStack, Table } from "@chakra-ui/react";
import { ChartDropdown } from "./ChartDropdown";

// Accepts: prs (array of PRs), styleOptions (for ECharts)
export const AuthorPRIntervalChart = ({ prs, styleOptions }) => {
  const [chartOptions, setChartOptions] = useState(null);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [allAuthors, setAllAuthors] = useState([]);
  const [averages, setAverages] = useState({});
  const [timeRange, setTimeRange] = useState([null, null]); // [min, max] timestamps
  const chartRef = useRef(null);
  // Helper to count weekdays between two dates (exclusive)
  function countWeekdaysBetween(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (start >= end) return 0;
    let count = 0;
    const current = new Date(start.getTime());
    current.setDate(current.getDate() + 1); // start exclusive
    while (current < end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++; // 0 = Sunday, 6 = Saturday
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
  // Memoize authorPRs and filteredAuthors for use in both effects
  const authorPRs = useRef({});
  const filteredAuthors = useRef([]);

  useEffect(() => {
    if (!prs?.length) return;
    // Group PRs by author and sort by date
    const _authorPRs = {};
    prs.forEach(pr => {
      const author = pr.author || "Unknown";
      if (!_authorPRs[author]) _authorPRs[author] = [];
      _authorPRs[author].push(pr);
    });
    authorPRs.current = _authorPRs;
    const authors = Object.keys(_authorPRs);
    setAllAuthors(authors);
    // Preselect all authors if none selected
    if (authors.length > 0 && selectedAuthors.length === 0) {
      setSelectedAuthors(authors);
    }
    // Only show selected authors
    filteredAuthors.current = selectedAuthors.length > 0 ? selectedAuthors : authors;
    // Prepare series: for each author, x = PR date, y = weekdays since previous PR
    const series = filteredAuthors.current.map(author => {
      const prsSorted = (_authorPRs[author] || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const data = prsSorted.map((pr, idx) => {
        if (idx === 0) return null; // No interval for first PR
        const prevDateStr = prsSorted[idx - 1].createdAt;
        const currDateStr = pr.createdAt;
        const diffWeekdays = countWeekdaysBetween(prevDateStr, currDateStr);
        return {
          value: [pr.createdAt, diffWeekdays],
        };
      }).filter(Boolean);
      return {
        name: author,
        type: "line",
        showSymbol: true,
        data,
      };
    });
    setChartOptions({
      tooltip: {
        trigger: "axis",
        formatter: params => {
          // params is an array of points
          return params.map(p => `${p.seriesName}<br/>${new Date(p.value[0]).toLocaleDateString()}: ${p.value[1]} days`).join('<br/>');
        }
      },
      legend: {
        data: filteredAuthors.current,
        textStyle: { color: '#ffffff' }
      },
      xAxis: {
        type: "time",
        axisLabel: { color: '#ffffff' }
      },
      yAxis: {
        type: "value",
        name: "Days Since Previous PR",
        axisLabel: { color: '#ffffff' }
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          show: true,
          start: 0,
          end: 100,
          bottom: '5%',
          height: 20,
          borderColor: '#ccc',
          textStyle: {
            color: '#666'
          },
          handleStyle: {
            color: '#999'
          },
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100
        }
      ],
      series,
    });
    // Set initial time range to full range if not set
    if (prs.length > 0 && (!timeRange[0] || !timeRange[1])) {
      const allDates = prs.map(pr => new Date(pr.createdAt).getTime());
      const min = Math.min(...allDates);
      const max = Math.max(...allDates);
      setTimeRange([min, max]);
    }
  }, [prs, selectedAuthors]);

  // Listen for dataZoom event on chart instance
  useEffect(() => {
    if (!chartRef.current) return;
    const echartsInstance = chartRef.current.getEchartsInstance ? chartRef.current.getEchartsInstance() : null;
    if (!echartsInstance) return;
    const handler = (params) => {
      const chart = params?.batch ? params.batch[0] : params;
      if (chart && chart.startValue !== undefined && chart.endValue !== undefined) {
        setTimeRange([chart.startValue, chart.endValue]);
      }
    };
    echartsInstance.on('datazoom', handler);
    return () => {
      echartsInstance.off('datazoom', handler);
    };
  }, [chartOptions]);

  useEffect(() => {
    // Calculate averages for selected authors, filtered by timeRange
    const averages = {};
    filteredAuthors.current.forEach(author => {
      const prsSorted = (authorPRs.current[author] || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      let sum = 0;
      let count = 0;
      for (let idx = 1; idx < prsSorted.length; idx++) {
        const currDate = new Date(prsSorted[idx].createdAt).getTime();
        // Only include if current PR is within selected time range
        if (
          timeRange[0] && timeRange[1] &&
          (currDate < timeRange[0] || currDate > timeRange[1])
        ) {
          continue;
        }
        const prevDateStr = prsSorted[idx - 1].createdAt;
        const currDateStr = prsSorted[idx].createdAt;
        sum += countWeekdaysBetween(prevDateStr, currDateStr);
        count++;
      }
      averages[author] = count > 0 ? (sum / count) : 0;
    });
    setAverages(averages);
  }, [timeRange, chartOptions]);

  return (
    <HStack align="flex-start">
      <Box flex={1}>
        <h3 style={{ color: '#ffffff', marginTop: '32px', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
          Days Between PRs by Author
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
          {chartOptions && <ECharts ref={chartRef} option={chartOptions} style={styleOptions} />}
        </Box>
      </Box>
      <Box minW="220px" bg="#23272f" borderRadius="md" p={4}>
        <h4 style={{ color: '#ffffff', marginBottom: '12px', fontSize: '16px', fontWeight: 'bold' }}>Average Interval (Weekdays)</h4>
        <Table.Root w="full">
          <Table.Header>
            <Table.Row>
              <Table.Cell fontWeight="bold">Author</Table.Cell>
              <Table.Cell fontWeight="bold" textAlign="right">Avg Days</Table.Cell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {Object.entries(averages).map(([author, avg]) => (
              <Table.Row key={author}>
                <Table.Cell>{author}</Table.Cell>
                <Table.Cell textAlign="right">{Number(avg).toFixed(2)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </HStack>
  );
}; 