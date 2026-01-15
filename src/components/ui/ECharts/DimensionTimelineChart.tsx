import { useState, useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";
import { ECharts } from "./ECharts";
import { ErrorBoundary } from "./ErrorBoundary";

interface DimensionTimelineChartProps {
  filteredData: any[];
  selectedDimensionField: string;
  selectedDimensionValues: string[];
  styleOptions?: any;
}

export const DimensionTimelineChart = ({
  filteredData,
  selectedDimensionField,
  selectedDimensionValues,
  styleOptions,
}: DimensionTimelineChartProps) => {
  const [chartOptions, setChartOptions] = useState(null);

  useEffect(() => {
    console.log('[DimensionTimelineChart] Props received:', {
      filteredDataLength: filteredData?.length,
      selectedDimensionField,
      selectedDimensionValues,
      selectedDimensionValuesLength: selectedDimensionValues.length
    });

    if (!filteredData || filteredData.length === 0 || selectedDimensionValues.length === 0) {
      console.log('[DimensionTimelineChart] Early return - conditions not met:', {
        hasFilteredData: !!filteredData,
        filteredDataLength: filteredData?.length,
        selectedDimensionValuesLength: selectedDimensionValues.length
      });
      setChartOptions(null);
      return;
    }

    // Group issues by dimension value and date
    const dimensionData: Record<string, Array<{ date: Date; value: string }>> = {};
    
    selectedDimensionValues.forEach(value => {
      dimensionData[value] = [];
    });

    let matchedIssues = 0;
    let issuesWithoutDate = 0;
    let issuesWithoutDimensionValue = 0;

    filteredData.forEach((issue: any, index: number) => {
      // Get the dimension value for this issue
      let issueValue: string | null = null;
      
      if (selectedDimensionField === 'labels') {
        // For labels, check if any of the selected values match
        const issueLabels = (issue.labels || []).map((l: any) => l.name);
        issueValue = selectedDimensionValues.find(v => issueLabels.includes(v)) || null;
      } else {
        // For other fields, get the value directly
        const fieldValue = String(issue[selectedDimensionField] || '');
        if (selectedDimensionValues.includes(fieldValue)) {
          issueValue = fieldValue;
        }
      }

      // Get creation date
      const createdAt = issue.created_at || issue.createdAt;
      
      if (index === 0) {
        console.log(`[DimensionTimelineChart] Sample issue ${index} - ALL FIELDS:`, issue);
        console.log(`[DimensionTimelineChart] Sample issue ${index} - Keys:`, Object.keys(issue));
        console.log(`[DimensionTimelineChart] Sample issue ${index} - createdAt value:`, issue.createdAt, typeof issue.createdAt);
        console.log(`[DimensionTimelineChart] Sample issue ${index} - created_at value:`, issue.created_at, typeof issue.created_at);
      }

      if (!issueValue) {
        issuesWithoutDimensionValue++;
        return;
      }

      if (!createdAt) {
        issuesWithoutDate++;
        return;
      }

      try {
        const date = new Date(createdAt);
        if (isNaN(date.getTime())) {
          console.warn('[DimensionTimelineChart] Invalid date:', createdAt);
          return;
        }
        
        dimensionData[issueValue].push({ date, value: issueValue });
        matchedIssues++;
      } catch (e) {
        console.error('Error parsing date:', createdAt, e);
      }
    });

    console.log('[DimensionTimelineChart] Processing summary:', {
      totalIssues: filteredData.length,
      matchedIssues,
      issuesWithoutDate,
      issuesWithoutDimensionValue
    });

    // Sort dates for each dimension
    Object.keys(dimensionData).forEach(value => {
      dimensionData[value].sort((a, b) => a.date.getTime() - b.date.getTime());
    });

    console.log('[DimensionTimelineChart] Dimension data collected:', {
      dimensionField: selectedDimensionField,
      dimensionCounts: Object.entries(dimensionData).map(([key, values]) => ({
        dimension: key,
        count: values.length
      }))
    });

    // Create cumulative count data for timeline
    const series = selectedDimensionValues.map(value => {
      const issues = dimensionData[value] || [];
      
      // Group issues by date (one entry per unique date)
      const dateMap = new Map<string, number>();
      issues.forEach((item, index) => {
        const dateStr = item.date.toISOString().split('T')[0]; // YYYY-MM-DD format
        // Only keep the latest cumulative count for each date
        dateMap.set(dateStr, index + 1);
      });
      
      // Convert to array and sort by date
      const cumulativeData: Array<[string, number]> = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      return {
        name: value,
        type: 'line',
        smooth: true,
        data: cumulativeData,
        emphasis: {
          focus: 'series'
        }
      };
    });

    // Filter out empty series
    const validSeries = series.filter(s => s.data.length > 0);

    console.log('[DimensionTimelineChart] Series data:', {
      totalSeries: series.length,
      validSeries: validSeries.length,
      seriesDetails: series.map(s => ({
        name: s.name,
        dataPoints: s.data.length
      }))
    });

    if (validSeries.length === 0) {
      console.log('[DimensionTimelineChart] No valid series data - returning null');
      setChartOptions(null);
      return;
    }

    const dimensionText = selectedDimensionField.charAt(0).toUpperCase() + selectedDimensionField.slice(1);
    
    const options = {
      title: {
        text: `Issue Creation Timeline by ${dimensionText}`,
        textStyle: {
          color: '#ffffff',
          fontSize: 16
        },
        left: 'center',
        top: 10
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const date = new Date(params[0].value[0]);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;
          const lines = params.map((p: any) => 
            `${p.marker} ${p.seriesName}: ${p.value[1]} issues`
          );
          return `${formattedDate}<br/>${lines.join('<br/>')}`;
        }
      },
      legend: {
        data: validSeries.map(s => s.name),
        textStyle: {
          color: '#ffffff'
        },
        top: 40,
        type: 'scroll'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          color: '#ffffff',
          formatter: (value: number) => {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Cumulative Issue Count',
        axisLabel: {
          color: '#ffffff'
        },
        nameTextStyle: {
          color: '#ffffff'
        }
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: 0,
          start: 0,
          end: 100,
          bottom: '5%',
          height: 20,
          borderColor: '#ccc',
          textStyle: {
            color: '#ffffff'
          },
          handleStyle: {
            color: '#999'
          },
          dataBackground: {
            lineStyle: {
              color: '#999'
            },
            areaStyle: {
              color: 'rgba(153, 153, 153, 0.2)'
            }
          }
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100
        }
      ],
      series: validSeries
    };

    console.log('[DimensionTimelineChart] Chart options set successfully');
    setChartOptions(options);
  }, [filteredData, selectedDimensionField, selectedDimensionValues]);

  if (!chartOptions) {
    return (
      <Box p={4} textAlign="center">
        <Text color="gray.400">
          Select dimension values to display the timeline chart
        </Text>
      </Box>
    );
  }

  return (
    <Box mt={4}>
      <ErrorBoundary chartName="Dimension Timeline">
        <ECharts option={chartOptions} style={styleOptions} />
      </ErrorBoundary>
    </Box>
  );
};

