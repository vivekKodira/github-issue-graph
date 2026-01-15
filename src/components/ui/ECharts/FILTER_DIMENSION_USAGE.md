# Reusable Filter and Dimension Components

This guide explains how to use the reusable filter and dimension components in any chart.

## Components

### 1. `useFilterableDimensions` Hook
A custom React hook that handles all the state management, filtering logic, and localStorage persistence.

### 2. `FilterPanel` Component
Displays all available filters with checkboxes, meta-filter controls, and AND/OR operator selection.

### 3. `DimensionPanel` Component
Displays dimension field selector and value checkboxes for chart axes.

## Quick Start

### Basic Usage Example

```tsx
import { useState, useEffect } from "react";
import { Box, Stack } from "@chakra-ui/react";
import { useFilterableDimensions } from "./hooks/useFilterableDimensions";
import { FilterPanel } from "./FilterPanel";
import { DimensionPanel } from "./DimensionPanel";

export const MyCustomChart = ({ flattenedData, styleOptions }) => {
  const [chartOptions, setChartOptions] = useState(null);
  const [showMetaFilter, setShowMetaFilter] = useState(false);

  // 1. Use the hook - provide your data and a unique storage key
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
    filteredData, // This is your filtered data ready to use!
  } = useFilterableDimensions({
    data: flattenedData,
    storageKey: 'myCustomChartState', // Change this for each chart
  });

  // 2. Use filteredData and selectedDimensionValues to create your chart
  useEffect(() => {
    if (selectedDimensionValues.length === 0) {
      setChartOptions(null);
      return;
    }

    // Your chart creation logic here using:
    // - filteredData (already filtered by the hook)
    // - selectedDimensionField (which field to use)
    // - selectedDimensionValues (which values to display)
    
    const myChartData = createMyChartData(
      filteredData, 
      selectedDimensionField, 
      selectedDimensionValues
    );
    
    setChartOptions(myChartData);
  }, [filteredData, selectedDimensionField, selectedDimensionValues]);

  return (
    <Box>
      <Stack gap={6}>
        {/* 3. Add the Filter Panel */}
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

        {/* 4. Add the Dimension Panel */}
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

        {/* 5. Render your chart */}
        {chartOptions && (
          <YourChartComponent options={chartOptions} />
        )}
      </Stack>
    </Box>
  );
};
```

## Hook Parameters

### `useFilterableDimensions({ data, storageKey, excludedFields? })`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | `any[]` | Yes | Your array of data items (issues, PRs, etc.) |
| `storageKey` | `string` | Yes | Unique key for localStorage persistence (e.g., `'myChartState'`) |
| `excludedFields` | `string[]` | No | Fields to exclude from filters (defaults to internal fields like `id`, `body`, etc.) |

## Hook Returns

| Property | Type | Description |
|----------|------|-------------|
| `filteredData` | `any[]` | **The filtered data array ready to use in your chart** |
| `selectedFilters` | `Record<string, string[]>` | Current filter selections |
| `filterOperator` | `"AND" \| "OR"` | How filters are combined |
| `setFilterOperator` | `Function` | Update the operator |
| `visibleFilters` | `Record<string, boolean>` | Which filter categories are visible |
| `filterableFields` | `Record<string, string[]>` | All available fields and their values |
| `uniqueLabels` | `string[]` | All unique label names |
| `handleFilterToggle` | `Function` | Toggle a filter value |
| `toggleFilterVisibility` | `Function` | Show/hide a filter category |
| `selectedDimensionField` | `string` | Currently selected dimension field |
| `setSelectedDimensionField` | `Function` | Change the dimension field |
| `selectedDimensionValues` | `string[]` | Selected dimension values |
| `setSelectedDimensionValues` | `Function` | Update dimension values |
| `dimensionValues` | `string[]` | Available values for current dimension field |
| `handleDimensionToggle` | `Function` | Toggle a dimension value |

## Features

✅ **Automatic Filtering**: The `filteredData` is automatically computed based on selected filters  
✅ **localStorage Persistence**: All selections are saved and restored automatically  
✅ **Generic & Flexible**: Works with any data structure with custom fields  
✅ **AND/OR Logic**: Choose how to combine multiple filters  
✅ **Meta-Filter**: Control which filter categories are visible  
✅ **Labels Support**: Special handling for GitHub labels (array fields)  
✅ **Type-Safe**: Written in TypeScript with proper types  

## Storage Key Convention

Use descriptive, unique storage keys for each chart:
- `'typeLabelAnalysisState'` - TypeLabelAnalysisChart
- `'sprintVelocityState'` - SprintVelocityChart
- `'teamPerformanceState'` - TeamPerformanceChart
- etc.

## Customization

### Exclude Additional Fields

```tsx
const { filteredData } = useFilterableDimensions({
  data: myData,
  storageKey: 'myChartState',
  excludedFields: ['id', 'secret_field', 'internal_id'], // Add your fields here
});
```

### Use Only Filters (No Dimensions)

```tsx
// Just import and use FilterPanel, skip DimensionPanel
<FilterPanel {...filterProps} />
// Use filteredData directly without dimensions
```

### Use Only Dimensions (No Filters)

```tsx
// Just import and use DimensionPanel, skip FilterPanel
<DimensionPanel {...dimensionProps} />
// selectedDimensionValues tells you what to display
```

## Real-World Examples

### Example 1: Standalone Chart with Built-in Filters
See `TypeLabelAnalysisChart.tsx` for a standalone implementation that manages its own filters and dimensions.

### Example 2: Dashboard with Shared Filters/Dimensions
See `IssueAnalysisDashboard.tsx` for an advanced example that:
- Uses shared filter/dimension state across multiple charts
- Includes a bar chart (`TypeLabelAnalysisChart`) showing distribution
- Includes a timeline chart (`DimensionTimelineChart`) showing cumulative issues over time
- Both charts react to the same filter and dimension selections

```tsx
// IssueAnalysisDashboard.tsx - Simplified example
import { useFilterableDimensions } from "./hooks/useFilterableDimensions";
import { FilterPanel } from "./FilterPanel";
import { DimensionPanel } from "./DimensionPanel";
import { TypeLabelAnalysisChart } from "./TypeLabelAnalysisChart";
import { DimensionTimelineChart } from "./DimensionTimelineChart";

export const IssueAnalysisDashboard = ({ flattenedData, styleOptions }) => {
  const { filteredData, ...filterDimensionProps } = useFilterableDimensions({
    data: flattenedData,
    storageKey: 'issueAnalysisDashboardState',
  });

  return (
    <Box>
      {/* Single set of filters and dimensions */}
      <FilterPanel {...filterDimensionProps} />
      <DimensionPanel {...filterDimensionProps} />
      
      {/* Both charts use the same filtered data and selections */}
      <TypeLabelAnalysisChart
        filteredData={filteredData}
        selectedDimensionField={filterDimensionProps.selectedDimensionField}
        selectedDimensionValues={filterDimensionProps.selectedDimensionValues}
        styleOptions={styleOptions}
      />
      
      <DimensionTimelineChart
        filteredData={filteredData}
        selectedDimensionField={filterDimensionProps.selectedDimensionField}
        selectedDimensionValues={filterDimensionProps.selectedDimensionValues}
        styleOptions={styleOptions}
      />
    </Box>
  );
};
```

This pattern allows you to:
- Control multiple charts with a single set of filters
- Maintain consistent filtering across different visualizations
- Reduce UI clutter by not repeating filter controls

