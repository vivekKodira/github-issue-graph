import { useState } from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import { useRxDBFiltersV2 } from "./hooks/useRxDBFiltersV2";
import { FilterPanel } from "./FilterPanel";
import { DimensionPanel } from "./DimensionPanel";
import { AdvancedFiltersPanel } from "./AdvancedFiltersPanel";
import { ExpertQueryPanel } from "./ExpertQueryPanel";
import { TypeLabelAnalysisChart } from "./TypeLabelAnalysisChart";
import { DimensionTimelineChart } from "./DimensionTimelineChart";
import { TimeEstimationWidget } from "./TimeEstimationWidget";
import { TimelinePlanningChart } from "./TimelinePlanningChart";

interface IssueAnalysisDashboardV2Props {
  flattenedData?: unknown[];  // Keep for backwards compatibility, but not used
  styleOptions?: Record<string, unknown>;
}

export const IssueAnalysisDashboardV2 = ({
  styleOptions,
}: IssueAnalysisDashboardV2Props) => {
  const [showMetaFilter, setShowMetaFilter] = useState(false);

  // Use the new RxDB-based filtering hook with Mango query support
  const {
    isReady,
    error,
    filterMode,
    setFilterMode,
    selectedFilters,
    filterOperator,
    setFilterOperator,
    visibleFilters,
    filterableFields,
    uniqueLabels,
    handleFilterToggle,
    toggleFilterVisibility,
    advancedFilters,
    updateAdvancedFilters,
    customQuery,
    applyCustomQuery,
    queryValidation,
    generatedQuery,
    selectedDimensionField,
    setSelectedDimensionField,
    selectedDimensionValues,
    setSelectedDimensionValues,
    dimensionValues,
    handleDimensionToggle,
    filteredData,
  } = useRxDBFiltersV2({
    storageKey: 'issueAnalysisDashboardV2State',
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
          Issue Analysis Dashboard (Advanced)
        </Text>

        {/* Filter Mode: Simple, Advanced, or Expert */}
        <FilterPanel
          filterableFields={filterableFields}
          uniqueLabels={uniqueLabels}
          selectedFilters={selectedFilters}
          filterOperator={filterOperator}
          visibleFilters={visibleFilters}
          showMetaFilter={showMetaFilter}
          filterMode={filterMode}
          onFilterToggle={handleFilterToggle}
          onOperatorChange={setFilterOperator}
          onToggleMetaFilter={() => setShowMetaFilter(!showMetaFilter)}
          onToggleFilterVisibility={toggleFilterVisibility}
          onFilterModeChange={setFilterMode}
        />

        {/* Advanced Filters (when mode is 'advanced') */}
        {filterMode === 'advanced' && (
          <AdvancedFiltersPanel
            advancedFilters={advancedFilters}
            onUpdate={updateAdvancedFilters}
          />
        )}

        {/* Expert Query Panel (when mode is 'expert') */}
        {filterMode === 'expert' && (
          <ExpertQueryPanel
            generatedQuery={generatedQuery}
            customQuery={customQuery}
            queryValidation={queryValidation}
            onApplyCustomQuery={applyCustomQuery}
          />
        )}

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

        {/* Filter Results Info */}
        <Box p={3} borderWidth="1px" borderRadius="4px" borderColor="gray.200">
          <Text fontSize="sm">
            📊 Showing <strong>{filteredData.length}</strong> issues
            {filterMode === 'expert' && customQuery && (
              <Text as="span" color="purple.500" ml={2}>
                (using custom query)
              </Text>
            )}
          </Text>
        </Box>

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

        {/* Time Estimation Widget */}
        <TimeEstimationWidget
          filteredData={filteredData}
          filterableFields={filterableFields}
          styleOptions={styleOptions}
        />

        {/* Timeline Planning Chart */}
        <TimelinePlanningChart
          filteredData={filteredData}
          filterableFields={filterableFields}
          styleOptions={styleOptions}
        />
      </Stack>
    </Box>
  );
};

