import { useState, useEffect } from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import barChartTemplate from "./templates/barChartTemplate.js";
import { ErrorBoundary } from "./ErrorBoundary";
import { useFilterableDimensions } from "./hooks/useFilterableDimensions";
import { FilterPanel } from "./FilterPanel";
import { DimensionPanel } from "./DimensionPanel";

interface Issue {
  id: string;
  title: string;
  number: number;
  body: string;
  state: string;
  Status?: string;
  html_url: string;
  labels?: Array<{ name: string; color: string }>;
}

interface TypeLabelAnalysisChartProps {
  flattenedData?: any[]; // Optional - for backward compatibility (standalone mode)
  filteredData?: any[]; // New prop - pre-filtered data (controlled mode)
  selectedDimensionField?: string; // New prop (controlled mode)
  selectedDimensionValues?: string[]; // New prop (controlled mode)
  filterOperator?: "AND" | "OR"; // New prop (controlled mode)
  selectedFilters?: Record<string, string[]>; // New prop (controlled mode)
  styleOptions?: Record<string, unknown>;
}

interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    type: string;
    stack?: string;
    data: number[];
    emphasis: {
      focus: string;
    };
  }>;
}

const createChartData = (
  filteredIssues: Issue[],
  selectedLabels: string[]
): ChartData => {
  const result: ChartData = {
    categories: [],
    series: [],
  };

  if (selectedLabels.length === 0) {
    return result;
  }

  // Create a map to count issues by label
  const labelCounts: Record<string, number> = {};
  
  selectedLabels.forEach(label => {
    labelCounts[label] = 0;
  });

  // Count issues that have each selected label
  filteredIssues.forEach((issue) => {
    const issueLabels = issue.labels?.map(l => l.name) || [];
    selectedLabels.forEach(label => {
      if (issueLabels.includes(label)) {
        labelCounts[label]++;
      }
    });
  });

  // Prepare chart data
  result.categories = selectedLabels;
  result.series = [{
    name: "Issue Count",
    type: "bar",
    data: selectedLabels.map(label => labelCounts[label]),
    emphasis: {
      focus: "self",
    },
  }];

  return result;
};

export const TypeLabelAnalysisChart = ({
  flattenedData,
  filteredData: propFilteredData,
  selectedDimensionField: propDimensionField,
  selectedDimensionValues: propDimensionValues,
  filterOperator: propFilterOperator,
  selectedFilters: propSelectedFilters,
  styleOptions,
}: TypeLabelAnalysisChartProps) => {
  const [chartOptions, setChartOptions] = useState(null);
  const [showMetaFilter, setShowMetaFilter] = useState(false);

  // Check if component is being used in standalone mode or controlled mode
  const isControlledMode = propFilteredData !== undefined;

  // Use the reusable hook only in standalone mode
  const hookResult = useFilterableDimensions({
    data: flattenedData || [],
    storageKey: 'typeLabelAnalysisState',
  });

  // Use props if in controlled mode, otherwise use hook state
  const selectedFilters = isControlledMode ? (propSelectedFilters || {}) : hookResult.selectedFilters;
  const filterOperator = isControlledMode ? (propFilterOperator || "AND") : hookResult.filterOperator;
  const setFilterOperator = hookResult.setFilterOperator;
  const visibleFilters = hookResult.visibleFilters;
  const filterableFields = hookResult.filterableFields;
  const uniqueLabels = hookResult.uniqueLabels;
  const handleFilterToggle = hookResult.handleFilterToggle;
  const toggleFilterVisibility = hookResult.toggleFilterVisibility;
  const selectedDimensionField = isControlledMode ? (propDimensionField || "labels") : hookResult.selectedDimensionField;
  const setSelectedDimensionField = hookResult.setSelectedDimensionField;
  const selectedDimensionValues = isControlledMode ? (propDimensionValues || []) : hookResult.selectedDimensionValues;
  const setSelectedDimensionValues = hookResult.setSelectedDimensionValues;
  const dimensionValues = hookResult.dimensionValues;
  const handleDimensionToggle = hookResult.handleDimensionToggle;
  const filteredData = isControlledMode ? propFilteredData : hookResult.filteredData;

  // Auto-update chart when filters or dimensions change
  useEffect(() => {
    if (selectedDimensionValues.length === 0) {
      setChartOptions(null);
      return;
    }

    const chartData = selectedDimensionField === 'labels' 
      ? createChartData(filteredData, selectedDimensionValues)
      : createChartDataForField(filteredData, selectedDimensionField, selectedDimensionValues);

    if (chartData.categories.length === 0) {
      setChartOptions(null);
      return;
    }

    const options = JSON.parse(JSON.stringify(barChartTemplate));
    options.xAxis.data = chartData.categories;
    options.series = chartData.series;
    
    const activeFilters = Object.entries(selectedFilters).filter(([_, values]) => values.length > 0);
    const titleParts = activeFilters.map(([fieldName, values]) => {
      const displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      return `${displayName}: ${values.join(", ")}`;
    });
    
    const filterText = activeFilters.length > 0 ? ` (${filterOperator})` : "";
    const dimensionText = `by ${selectedDimensionField.charAt(0).toUpperCase() + selectedDimensionField.slice(1)}`;
    options.title = {
      text: `Issue Analysis ${dimensionText}${titleParts.length > 0 ? `: ${titleParts.join(" | ")}${filterText}` : ""}`,
      textStyle: {
        color: '#ffffff',
        fontSize: 16
      },
      left: 'center',
      top: 10
    };

    setChartOptions(options);
  }, [selectedFilters, selectedDimensionField, selectedDimensionValues, filterOperator, filteredData]);

  // Create chart data for non-label fields
  const createChartDataForField = (issues: any[], fieldName: string, selectedValues: string[]) => {
    const result: ChartData = {
      categories: [],
      series: [],
    };

    if (selectedValues.length === 0) {
      return result;
    }

    // Count issues by selected field values
    const valueCounts: Record<string, number> = {};
    
    selectedValues.forEach(value => {
      valueCounts[value] = 0;
    });

    issues.forEach((issue: any) => {
      const issueValue = String(issue[fieldName] || '');
      if (selectedValues.includes(issueValue)) {
        valueCounts[issueValue]++;
      }
    });

    result.categories = selectedValues;
    result.series = [{
      name: "Issue Count",
      type: "bar",
      data: selectedValues.map(value => valueCounts[value]),
      emphasis: {
        focus: "self",
      },
    }];

    return result;
  };


  return (
    <Box>
      <Stack gap={6}>
        {/* Only show filters and dimensions in standalone mode */}
        {!isControlledMode && (
          <>
            <Text fontSize="lg" fontWeight="bold">
              Type/Label Analysis
            </Text>

            {/* Filters Section */}
            <FilterPanel
              filterableFields={filterableFields}
              uniqueLabels={uniqueLabels}
              selectedFilters={selectedFilters}
              filterOperator={filterOperator}
              visibleFilters={visibleFilters}
              showMetaFilter={showMetaFilter}
              onFilterToggle={handleFilterToggle}
              onOperatorChange={setFilterOperator}
              onToggleMetaFilter={() => setShowMetaFilter(!showMetaFilter)}
              onToggleFilterVisibility={toggleFilterVisibility}
            />

            {/* Dimensions Section */}
            <DimensionPanel
              filterableFields={filterableFields}
              selectedDimensionField={selectedDimensionField}
              dimensionValues={dimensionValues}
              selectedDimensionValues={selectedDimensionValues}
              onDimensionFieldChange={(field) => {
                setSelectedDimensionField(field);
                setSelectedDimensionValues([]);
              }}
              onDimensionToggle={handleDimensionToggle}
            />
          </>
        )}

        {/* Chart Section */}
        {chartOptions && (
          <Box mt={isControlledMode ? 0 : 4}>
            <ErrorBoundary chartName="Type/Label Analysis">
              <ECharts option={chartOptions} style={styleOptions} />
            </ErrorBoundary>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

