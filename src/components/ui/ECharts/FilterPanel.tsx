import { Box, Text, SimpleGrid, VStack, HStack } from "@chakra-ui/react";

interface FilterPanelProps {
  filterableFields: Record<string, string[]>;
  uniqueLabels: string[];
  selectedFilters: Record<string, string[]>;
  filterOperator: "AND" | "OR";
  visibleFilters: Record<string, boolean>;
  showMetaFilter: boolean;
  onFilterToggle: (fieldName: string, value: string) => void;
  onOperatorChange: (operator: "AND" | "OR") => void;
  onToggleMetaFilter: () => void;
  onToggleFilterVisibility: (filterName: string) => void;
}

export const FilterPanel = ({
  filterableFields,
  uniqueLabels,
  selectedFilters,
  filterOperator,
  visibleFilters,
  showMetaFilter,
  onFilterToggle,
  onOperatorChange,
  onToggleMetaFilter,
  onToggleFilterVisibility,
}: FilterPanelProps) => {
  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Text fontSize="md" fontWeight="semibold">
          Filters
        </Text>
        <HStack gap={3}>
          <button
            onClick={onToggleMetaFilter}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              fontSize: "12px",
              backgroundColor: "transparent",
              color: "inherit",
              cursor: "pointer"
            }}
          >
            {showMetaFilter ? "Hide" : "Show"} Filter Options
          </button>
          <Box>
            <Text fontSize="xs" mb={1}>Filter Operator</Text>
            <select
              value={filterOperator}
              onChange={(e) => onOperatorChange(e.target.value as "AND" | "OR")}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #E2E8F0",
                fontSize: "12px",
                backgroundColor: "transparent",
                color: "inherit",
                cursor: "pointer"
              }}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </Box>
        </HStack>
      </HStack>

      {/* Meta Filter */}
      {showMetaFilter && (
        <Box 
          mb={4} 
          p={3} 
          borderWidth="1px" 
          borderRadius="4px" 
          borderColor="#3182CE"
          style={{ backgroundColor: '#EBF8FF' }}
        >
          <Text fontSize="sm" fontWeight="medium" mb={2} style={{ color: '#1A365D' }}>
            Select Filters to Display:
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} gap={3}>
              {Object.keys(filterableFields).map((fieldName) => (
                <HStack key={`meta-${fieldName}`} gap={2}>
                  <input
                    type="checkbox"
                    id={`meta-filter-${fieldName}`}
                    checked={visibleFilters[fieldName] === true}
                    onChange={() => onToggleFilterVisibility(fieldName)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label 
                    htmlFor={`meta-filter-${fieldName}`}
                    style={{ 
                      cursor: 'pointer', 
                      userSelect: 'none', 
                      fontSize: '13px',
                      color: '#1A365D',
                      fontWeight: '500'
                    }}
                  >
                    {fieldName}
                  </label>
                </HStack>
              ))}
              {uniqueLabels.length > 0 && (
                <HStack key="meta-labels" gap={2}>
                  <input
                    type="checkbox"
                    id="meta-filter-labels"
                    checked={visibleFilters['labels'] === true}
                    onChange={() => onToggleFilterVisibility('labels')}
                    style={{ cursor: 'pointer' }}
                  />
                  <label 
                    htmlFor="meta-filter-labels"
                    style={{ 
                      cursor: 'pointer', 
                      userSelect: 'none', 
                      fontSize: '13px',
                      color: '#1A365D',
                      fontWeight: '500'
                    }}
                  >
                    Labels
                  </label>
                </HStack>
              )}
          </SimpleGrid>
        </Box>
      )}
      
      <SimpleGrid columns={{ base: 1, md: 3, lg: 4 }} gap={4}>
        {/* Dynamically render all filterable fields */}
        {Object.entries(filterableFields).map(([fieldName, values]) => 
          visibleFilters[fieldName] === true && (
            <Box key={fieldName}>
              <Text fontSize="sm" mb={2} fontWeight="medium">
                {fieldName}
              </Text>
              <Box
                maxH="150px"
                overflowY="auto"
                p={2}
                borderWidth="1px"
                borderRadius="4px"
                borderColor="gray.200"
              >
                <VStack align="stretch" gap={1}>
                  {values.map((value) => (
                    <HStack key={`${fieldName}-${value}`} gap={2}>
                      <input
                        type="checkbox"
                        id={`filter-${fieldName}-${value}`}
                        checked={(selectedFilters[fieldName] || []).includes(value)}
                        onChange={() => onFilterToggle(fieldName, value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label 
                        htmlFor={`filter-${fieldName}-${value}`}
                        style={{ cursor: 'pointer', userSelect: 'none', fontSize: '14px' }}
                      >
                        {value}
                      </label>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </Box>
          )
        )}

        {/* Labels as a special filter */}
        {uniqueLabels.length > 0 && visibleFilters['labels'] === true && (
          <Box>
            <Text fontSize="sm" mb={2} fontWeight="medium">
              Labels
            </Text>
            <Box
              maxH="150px"
              overflowY="auto"
              p={2}
              borderWidth="1px"
              borderRadius="4px"
              borderColor="gray.200"
            >
              <VStack align="stretch" gap={1}>
                {uniqueLabels.map((label) => (
                  <HStack key={`filter-label-${label}`} gap={2}>
                    <input
                      type="checkbox"
                      id={`filter-label-${label}`}
                      checked={(selectedFilters['labels'] || []).includes(label)}
                      onChange={() => onFilterToggle('labels', label)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label 
                      htmlFor={`filter-label-${label}`}
                      style={{ cursor: 'pointer', userSelect: 'none', fontSize: '14px' }}
                    >
                      {label}
                    </label>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </Box>
        )}
      </SimpleGrid>
    </Box>
  );
};

