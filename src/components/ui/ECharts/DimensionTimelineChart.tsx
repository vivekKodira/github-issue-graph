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
    if (!filteredData || filteredData.length === 0 || selectedDimensionValues.length === 0) {
      setChartOptions(null);
      return;
    }

    // Group issues by dimension value and date
    const dimensionData: Record<string, Array<{ date: Date; value: string }>> = {};
    
    selectedDimensionValues.forEach(value => {
      dimensionData[value] = [];
    });

    filteredData.forEach((issue: any) => {
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
      if (!createdAt || !issueValue) return;

      try {
        const date = new Date(createdAt);
        if (isNaN(date.getTime())) return;
        
        dimensionData[issueValue].push({ date, value: issueValue });
      } catch (e) {
        console.error('Error parsing date:', createdAt, e);
      }
    });

    // Sort dates for each dimension
    Object.keys(dimensionData).forEach(value => {
      dimensionData[value].sort((a, b) => a.date.getTime() - b.date.getTime());
    });

    // Create cumulative count data for timeline
    const series = selectedDimensionValues.map(value => {
      const issues = dimensionData[value] || [];
      const cumulativeData: Array<[string, number]> = [];
      
      issues.forEach((item, index) => {
        const dateStr = item.date.toISOString().split('T')[0]; // YYYY-MM-DD format
        cumulativeData.push([dateStr, index + 1]);
      });

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

    if (validSeries.length === 0) {
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
          const date = new Date(params[0].value[0]).toLocaleDateString();
          const lines = params.map((p: any) => 
            `${p.marker} ${p.seriesName}: ${p.value[1]} issues`
          );
          return `${date}<br/>${lines.join('<br/>')}`;
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
            return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
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

