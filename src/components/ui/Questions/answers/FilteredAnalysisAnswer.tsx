import { useState, type ReactNode } from "react";
import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useRxDBFiltersV2 } from "@/components/ui/ECharts/hooks/useRxDBFiltersV2";
import { FilterPanel } from "@/components/ui/ECharts/FilterPanel";
import { DimensionPanel } from "@/components/ui/ECharts/DimensionPanel";
import { AdvancedFiltersPanel } from "@/components/ui/ECharts/AdvancedFiltersPanel";
import { ExpertQueryPanel } from "@/components/ui/ECharts/ExpertQueryPanel";

type FilterState = ReturnType<typeof useRxDBFiltersV2>;

interface FilteredAnalysisAnswerProps {
  /** Whether to show the dimension picker (only B4/B5 use dimensions). */
  showDimensions?: boolean;
  /** Render the question's chart from the shared filter state. */
  children: (state: FilterState) => ReactNode;
}

/**
 * Shared shell for the RxDB-filtered analysis answers (B2–B5, F1). It owns the
 * `useRxDBFiltersV2` hook + the filter/dimension panels that used to live in
 * `IssueAnalysisDashboardV2`, and hands the resulting state to a single chart.
 *
 * Uses the same `storageKey` as the legacy dashboard so a user's existing
 * filter selections carry over and persist across these answers.
 */
export function FilteredAnalysisAnswer({
  showDimensions = false,
  children,
}: FilteredAnalysisAnswerProps) {
  const [showMetaFilter, setShowMetaFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const state = useRxDBFiltersV2({ storageKey: "issueAnalysisDashboardV2State" });

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
  } = state;

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
        <Text>Initializing database…</Text>
      </Box>
    );
  }

  const activeCount = Array.isArray(selectedFilters) ? selectedFilters.length : 0;

  return (
    <Stack gap={4}>
      {/* Collapsible filter controls — chart stays the focus. */}
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <Text fontSize="sm">
          📊 Showing <strong>{filteredData.length}</strong> issues
          {filterMode === "expert" && customQuery && (
            <Text as="span" color="purple.500" ml={2}>
              (using custom query)
            </Text>
          )}
        </Text>
        <Button size="sm" variant="outline" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? "Hide filters" : "Filters"}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </HStack>

      {showFilters && (
        <Stack gap={4} p={4} borderWidth="1px" borderRadius="md">
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

          {filterMode === "advanced" && (
            <AdvancedFiltersPanel
              advancedFilters={advancedFilters}
              onUpdate={updateAdvancedFilters}
            />
          )}

          {filterMode === "expert" && (
            <ExpertQueryPanel
              generatedQuery={generatedQuery}
              customQuery={customQuery}
              queryValidation={queryValidation}
              onApplyCustomQuery={applyCustomQuery}
            />
          )}

          {showDimensions && (
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
          )}
        </Stack>
      )}

      {filteredData.length === 0 ? (
        <Box py={12} textAlign="center" color="fg.muted">
          No issues match these filters — adjust or clear them above.
        </Box>
      ) : (
        children(state)
      )}
    </Stack>
  );
}
