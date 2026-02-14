import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect, useCallback } from "react";
import { Box } from "@chakra-ui/react";
import barChartTemplate from "./templates/barChartTemplate.js";
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { ErrorBoundary } from "./ErrorBoundary";
import { DateRangeFilterStrip } from "./DateRangeFilterStrip";
import { createChartData } from '@/util/chartDataGenerators/assigneeChartData';

export { createChartData } from '@/util/chartDataGenerators/assigneeChartData';

const AssigneeChartContent = ({ flattenedData, styleOptions, searchTerm }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptions, setChartOptions] = useState(null);
  const [dateFilteredData, setDateFilteredData] = useState<unknown[]>([]);

  const handleFilteredData = useCallback((filtered: unknown[]) => {
    setDateFilteredData(filtered);
  }, []);

  const dataToUse = dateFilteredData.length > 0 ? dateFilteredData : (flattenedData ?? []);
  
  useEffect(() => {
    const chartData = createChartData(dataToUse, projectKeys);
    
    // Filter data based on search term
    if (searchTerm) {
      const filteredCategories = chartData.stackedBySize.categories.filter(category =>
        category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Update categories and data arrays
      chartData.stackedBySize.categories = filteredCategories;
      chartData.stackedBySize.series = chartData.stackedBySize.series.map(series => ({
        ...series,
        data: series.data.filter((_, index) => 
          chartData.stackedBySize.categories.includes(chartData.stackedBySize.categories[index])
        )
      }));
    }

    const chartOptions = JSON.parse(JSON.stringify(barChartTemplate));
    chartOptions.xAxis.data = chartData?.stackedBySize?.categories || [];
    chartOptions.series = chartData?.stackedBySize?.series || [];
    const firstSeriesData = chartOptions.series?.[0]?.data;
    if (!firstSeriesData || firstSeriesData.length <= 1) {
      setChartOptions(null);
      return;
    }
    setChartOptions(chartOptions);
  }, [dataToUse, projectKeys, searchTerm]);
  
  const chartHeight = 350;
  return (
    <Box display="flex" flexDirection="column" width="100%">
      {flattenedData?.length ? (
        <Box flexShrink={0} width="100%" marginBottom={4}>
          <DateRangeFilterStrip
            data={flattenedData as Record<string, unknown>[]}
            dateField="createdAt"
            onFilteredData={handleFilteredData as (filtered: Record<string, unknown>[]) => void}
            styleOptions={styleOptions}
          />
        </Box>
      ) : null}
      {chartOptions && (
        <Box width="100%" height={`${chartHeight}px`} minHeight={`${chartHeight}px`} overflow="hidden" flexShrink={0}>
          <ECharts option={chartOptions} style={{ width: '100%', height: chartHeight }} />
        </Box>
      )}
    </Box>
  );
};

export const AssigneeChart = (props) => {
  return (
    <ErrorBoundary chartName="Assignee">
      <AssigneeChartContent {...props} />
    </ErrorBoundary>
  );
};
