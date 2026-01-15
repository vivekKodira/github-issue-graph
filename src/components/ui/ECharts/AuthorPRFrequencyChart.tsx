import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { ChartDropdown } from "./ChartDropdown";
import { ErrorBoundary } from "./ErrorBoundary";

// Accepts: prs (array of PRs), styleOptions (for ECharts)
export const AuthorPRFrequencyChart = ({ prs, styleOptions }) => {
  const [chartOptions, setChartOptions] = useState(null);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [allAuthors, setAllAuthors] = useState([]);

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
    setAllAuthors(authors);
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

    setChartOptions({
      /* title: {
        text: "PR Submission Frequency by Author",
        left: "center",
        textStyle: { color: '#ffffff' }
      }, */
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
      series,
    });
  }, [prs, selectedAuthors]);

  return (
    <Box>
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
            <ECharts option={chartOptions} style={styleOptions} />
          </ErrorBoundary>
        )}
      </Box>
    </Box>
  );
}; 