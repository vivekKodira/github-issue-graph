import { useState } from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import { useRxDBFilters } from "./hooks/useRxDBFilters";
import { FilterPanel } from "./FilterPanel";
import { DimensionPanel } from "./DimensionPanel";
import { TypeLabelAnalysisChart } from "./TypeLabelAnalysisChart";
import { DimensionTimelineChart } from "./DimensionTimelineChart";

interface IssueAnalysisDashboardProps {
  flattenedData?: unknown[];  // Keep for backwards compatibility, but not used
  styleOptions?: Record<string, unknown>;
}

export const IssueAnalysisDashboard = ({
  styleOptions,
}: IssueAnalysisDashboardProps) => {
  const [showMetaFilter, setShowMetaFilter] = useState(false);

  // Use the RxDB-based filtering hook
  const {
    isReady,
    error,
    selectedFilters,
    filterOperator,
    setFilterOperator,
    visibleFilters,
    filterableFields,
    uniqueLabels,
    handleFilterToggle,
    toggleFilterVisibility,
    selectedDimensionField,
    setSelectedDimensionField,
    selectedDimensionValues,
    setSelectedDimensionValues,
    dimensionValues,
    handleDimensionToggle,
    filteredData,
  } = useRxDBFilters({
    storageKey: 'issueAnalysisDashboardState',
  });

  if (error) {
    return (
      <Box p={6}>
        <Text color="red.500" fontWeight="bold">Database Error</Text>
        <Text mt={2} color="red.400">{error.message}</Text>
        <Text mt={4} fontSize="sm" color="gray.400">
          Try clearing the database cache and refreshing the page.
        </Text>
      </Box>
    );
  }

  if (!isReady) {
    return (
      <Box p={6}>
        <Text>Initializing database...</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Stack gap={6}>
        <Text fontSize="lg" fontWeight="bold">
          Issue Analysis Dashboard
        </Text>

        {/* Shared Filters Section */}
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

        {/* Shared Dimensions Section */}
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

        {/* Bar Chart - Distribution */}
        <TypeLabelAnalysisChart
          filteredData={filteredData}
          selectedDimensionField={selectedDimensionField}
          selectedDimensionValues={selectedDimensionValues}
          filterOperator={filterOperator}
          selectedFilters={selectedFilters}
          styleOptions={styleOptions}
        />

        {/* Timeline Chart - Cumulative over time */}
        <DimensionTimelineChart
          filteredData={filteredData}
          selectedDimensionField={selectedDimensionField}
          selectedDimensionValues={selectedDimensionValues}
          styleOptions={styleOptions}
        />
      </Stack>
    </Box>
  );
};

