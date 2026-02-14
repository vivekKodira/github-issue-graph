import { useState, useEffect, useMemo } from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import barChartTemplate from "./templates/barChartTemplate.js";
import { ErrorBoundary } from "./ErrorBoundary";
import { useFilterableDimensions } from "./hooks/useFilterableDimensions";
import { FilterPanel } from "./FilterPanel";
import { DimensionPanel } from "./DimensionPanel";
import { createChartData, createChartDataForField } from "@/util/chartDataGenerators/typeLabelAnalysisData";

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

// ChartData type and createChartData function now imported from utility

const EMPTY_ARRAY: any[] = [];

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

  // Stabilize data to prevent infinite loops in useFilterableDimensions
  const stableData = useMemo(() => flattenedData || EMPTY_ARRAY, [flattenedData]);

  // Use the reusable hook only in standalone mode
  const hookResult = useFilterableDimensions({
    data: stableData,
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

  // createChartDataForField is now imported from utility

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

