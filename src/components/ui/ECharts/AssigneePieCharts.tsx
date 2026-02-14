import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Box, HStack } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js";
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { ChartDropdown } from './ChartDropdown';
import { ErrorBoundary } from "./ErrorBoundary";
import { AverageByPersonTable } from "./AverageByPersonTable";
import { DateRangeFilterStrip } from "./DateRangeFilterStrip";
import { createPieChartData, createAssigneesBySizePieData } from '@/util/chartDataGenerators/assigneePieChartData';

export { createPieChartData, createAssigneesBySizePieData } from '@/util/chartDataGenerators/assigneePieChartData';

export const AssigneePieCharts = ({ flattenedData, styleOptions, searchTerm }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptions, setChartOptions] = useState(pieChartTemplate);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);
  const [dateFilteredData, setDateFilteredData] = useState<unknown[]>([]);

  const handleFilteredData = useCallback((filtered: unknown[]) => {
    setDateFilteredData(filtered);
  }, []);

  const dataToUse = useMemo(
    () => (dateFilteredData.length > 0 ? dateFilteredData : (flattenedData ?? [])),
    [dateFilteredData, flattenedData]
  );

  // Tasks by Assignee (by complexity): complexity dropdown -> assignee pie + table
  const [chartOptionsBySize, setChartOptionsBySize] = useState(pieChartTemplate);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [assigneePercentages, setAssigneePercentages] = useState<Record<string, number>>({});

  useEffect(() => {
    const pieData = createPieChartData(dataToUse, projectKeys);
    
    // Filter data based on search term
    const filteredData = searchTerm
      ? pieData.filter(({ assignee }) => 
          assignee.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : pieData;
    
    // Extract available assignees
    const assignees = filteredData.map(({ assignee }) => assignee);
    setAvailableAssignees(assignees);
    
    // Set first assignee as default if none selected
    if (assignees.length > 0 && selectedAssignees.length === 0) {
      setSelectedAssignees([assignees[0]]);
    }
  }, [dataToUse, projectKeys, searchTerm]);

  useEffect(() => {
    if (selectedAssignees.length === 0) return;
    
    const pieData = createPieChartData(dataToUse, projectKeys);
    const selectedData = pieData.find(({ assignee }) => assignee === selectedAssignees[0]);
    
    if (selectedData) {
      const newChartOptions = {
        ...pieChartTemplate,
        title: {
          ...pieChartTemplate.title,
          text: ''
        },
        series: [{
          ...pieChartTemplate.series[0],
          name: 'Size',
          data: selectedData.data
        }]
      };
      setChartOptions(newChartOptions);
    }
  }, [selectedAssignees, dataToUse, projectKeys]);

  // Tasks by Assignee: derive sizes and default selection
  useEffect(() => {
    const bySize = createAssigneesBySizePieData(dataToUse, projectKeys);
    const sizes = Object.keys(bySize);
    setAvailableSizes(sizes);
    if (sizes.length > 0 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [dataToUse, projectKeys]);

  // Tasks by Assignee: build pie + percentages when selected size or search changes
  useEffect(() => {
    const bySize = createAssigneesBySizePieData(dataToUse, projectKeys);
    const sizes = Object.keys(bySize);
    const effectiveSize = selectedSize && bySize[selectedSize] ? selectedSize : sizes[0];
    const pieData = effectiveSize ? bySize[effectiveSize] ?? [] : [];
    const filteredData = searchTerm
      ? pieData.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : pieData;
    const total = filteredData.reduce((sum, d) => sum + d.value, 0);
    const pct: Record<string, number> = {};
    filteredData.forEach((d) => {
      pct[d.name] = total ? (d.value / total) * 100 : 0;
    });
    setAssigneePercentages(pct);

    const options = JSON.parse(JSON.stringify(pieChartTemplate));
    options.series = [{
      type: 'pie',
      radius: '50%',
      data: filteredData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }];
    setChartOptionsBySize(options);
  }, [dataToUse, projectKeys, selectedSize, searchTerm]);

  const handleAssigneeChange = (values: string[]) => {
    setSelectedAssignees(values);
  };

  const handleSizeChange = (values: string[]) => {
    setSelectedSize(values[0] ?? "");
  };

  const chartHeight = 350;
  return (
    <Box display="flex" flexDirection="column" width="100%">
      <h3 style={{ 
        color: '#ffffff', 
        marginBottom: '8px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Tasks by Size
      </h3>
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
      <Box flexShrink={0} marginBottom={4}>
        <ChartDropdown
          title="Select assignee"
          options={availableAssignees}
          selectedValues={selectedAssignees}
          onSelectionChange={handleAssigneeChange}
          multiple={false}
          placeholder="Select an assignee"
        />
      </Box>
      <Box width="100%" height={`${chartHeight}px`} minHeight={`${chartHeight}px`} overflow="hidden" flexShrink={0}>
        <ErrorBoundary chartName="Assignee Pie">
          <ECharts option={chartOptions} style={{ width: '100%', height: chartHeight }} />
        </ErrorBoundary>
      </Box>

      <h3 style={{ 
        color: '#ffffff', 
        marginBottom: '0',
        marginTop: '24px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Tasks by Assignee
      </h3>
      <HStack align="flex-start" marginTop={4}>
        <Box flex={1} minWidth={0} display="flex" flexDirection="column">
          <Box flexShrink={0} marginBottom={4}>
            <ChartDropdown
              title="Select complexity"
              options={availableSizes}
              selectedValues={selectedSize ? [selectedSize] : []}
              onSelectionChange={handleSizeChange}
              multiple={false}
              placeholder="Select a complexity"
            />
          </Box>
          <Box width="100%" height={`${chartHeight}px`} minHeight={`${chartHeight}px`} overflow="hidden" flexShrink={0}>
            <ErrorBoundary chartName="Assignee by Size Pie">
              <ECharts option={chartOptionsBySize} style={{ width: '100%', height: chartHeight }} />
            </ErrorBoundary>
          </Box>
        </Box>
        <AverageByPersonTable
          personLabel="Assignee"
          valueLabel="%"
          averages={assigneePercentages}
          valueFormat={(n) => `${Number(n).toFixed(1)}%`}
          title="Tasks by Assignee"
        />
      </HStack>
    </Box>
  );
}; 