import { useState } from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import { useFilterableDimensions } from "./hooks/useFilterableDimensions";
import { FilterPanel } from "./FilterPanel";
import { DimensionPanel } from "./DimensionPanel";
import { TypeLabelAnalysisChart } from "./TypeLabelAnalysisChart";
import { DimensionTimelineChart } from "./DimensionTimelineChart";

interface IssueAnalysisDashboardProps {
  flattenedData: any[];
  styleOptions?: any;
}

export const IssueAnalysisDashboard = ({
  flattenedData,
  styleOptions,
}: IssueAnalysisDashboardProps) => {
  const [showMetaFilter, setShowMetaFilter] = useState(false);

  // Use the reusable hook for filters and dimensions (shared by both charts)
  const {
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
  } = useFilterableDimensions({
    data: flattenedData,
    storageKey: 'issueAnalysisDashboardState',
  });

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

