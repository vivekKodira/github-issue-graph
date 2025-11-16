import { Box, Text, VStack, HStack, Input, Stack } from "@chakra-ui/react";
import { AdvancedFilters } from "@/util/mangoQueryBuilder";

interface AdvancedFiltersPanelProps {
  advancedFilters: AdvancedFilters;
  onUpdate: (updates: Partial<AdvancedFilters>) => void;
}

export const AdvancedFiltersPanel = ({
  advancedFilters,
  onUpdate,
}: AdvancedFiltersPanelProps) => {
  return (
    <Box>
      <Text fontSize="md" fontWeight="semibold" mb={3}>
        Advanced Filters
      </Text>

      <VStack align="stretch" gap={4}>
        {/* Text Search */}
        <Box>
          <Text fontSize="sm" mb={2} fontWeight="medium">
            🔍 Text Search
          </Text>
          <Text fontSize="xs" color="gray.500" mb={2}>
            Search in title and body (case-insensitive)
          </Text>
          <Input
            placeholder="Enter search text..."
            value={advancedFilters.textSearch || ''}
            onChange={(e) => onUpdate({ textSearch: e.target.value })}
            size="sm"
          />
        </Box>

        {/* Date Range */}
        <Box>
          <Text fontSize="sm" mb={2} fontWeight="medium">
            📅 Date Range
          </Text>
          <VStack align="stretch" gap={2}>
            <Box>
              <Text fontSize="xs" mb={1}>Field:</Text>
              <select
                value={advancedFilters.dateRange?.field || 'createdAt'}
                onChange={(e) => onUpdate({
                  dateRange: {
                    ...advancedFilters.dateRange,
                    field: e.target.value as 'createdAt' | 'updatedAt'
                  }
                })}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  color: 'inherit'
                }}
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Updated Date</option>
              </select>
            </Box>
            
            <HStack>
              <Box flex={1}>
                <Text fontSize="xs" mb={1}>From:</Text>
                <Input
                  type="date"
                  size="sm"
                  value={advancedFilters.dateRange?.from || ''}
                  onChange={(e) => onUpdate({
                    dateRange: {
                      ...advancedFilters.dateRange,
                      field: advancedFilters.dateRange?.field || 'createdAt',
                      from: e.target.value
                    }
                  })}
                />
              </Box>
              
              <Box flex={1}>
                <Text fontSize="xs" mb={1}>To:</Text>
                <Input
                  type="date"
                  size="sm"
                  value={advancedFilters.dateRange?.to || ''}
                  onChange={(e) => onUpdate({
                    dateRange: {
                      ...advancedFilters.dateRange,
                      field: advancedFilters.dateRange?.field || 'createdAt',
                      to: e.target.value
                    }
                  })}
                />
              </Box>
            </HStack>

            {(advancedFilters.dateRange?.from || advancedFilters.dateRange?.to) && (
              <button
                onClick={() => onUpdate({ dateRange: undefined })}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #FC8181',
                  fontSize: '12px',
                  backgroundColor: 'transparent',
                  color: '#FC8181',
                  cursor: 'pointer'
                }}
              >
                Clear Date Range
              </button>
            )}
          </VStack>
        </Box>

        {/* Numeric Ranges */}
        <Box>
          <Text fontSize="sm" mb={2} fontWeight="medium">
            🔢 Numeric Range (Custom Fields)
          </Text>
          <Text fontSize="xs" color="gray.500" mb={2}>
            Filter by numeric custom field values
          </Text>
          <VStack align="stretch" gap={2}>
            <Box>
              <Text fontSize="xs" mb={1}>Field Name:</Text>
              <Input
                placeholder="e.g., Estimate (days)"
                size="sm"
                id="numeric-field-name"
              />
            </Box>
            
            <HStack>
              <Box flex={1}>
                <Text fontSize="xs" mb={1}>Min:</Text>
                <Input
                  type="number"
                  placeholder="Min value"
                  size="sm"
                  id="numeric-min"
                />
              </Box>
              
              <Box flex={1}>
                <Text fontSize="xs" mb={1}>Max:</Text>
                <Input
                  type="number"
                  placeholder="Max value"
                  size="sm"
                  id="numeric-max"
                />
              </Box>
            </HStack>

            <button
              onClick={() => {
                const fieldNameInput = document.getElementById('numeric-field-name') as HTMLInputElement;
                const minInput = document.getElementById('numeric-min') as HTMLInputElement;
                const maxInput = document.getElementById('numeric-max') as HTMLInputElement;
                
                const fieldName = fieldNameInput?.value;
                const min = minInput?.value ? Number(minInput.value) : undefined;
                const max = maxInput?.value ? Number(maxInput.value) : undefined;

                if (fieldName && (min !== undefined || max !== undefined)) {
                  onUpdate({
                    numericRanges: {
                      ...advancedFilters.numericRanges,
                      [fieldName]: { min, max }
                    }
                  });

                  // Clear inputs
                  fieldNameInput.value = '';
                  minInput.value = '';
                  maxInput.value = '';
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #3182CE',
                fontSize: '12px',
                backgroundColor: '#3182CE',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Add Numeric Range
            </button>

            {/* Display active numeric ranges */}
            {advancedFilters.numericRanges && Object.keys(advancedFilters.numericRanges).length > 0 && (
              <Box mt={2} p={2} borderWidth="1px" borderRadius="4px" borderColor="gray.200">
                <Text fontSize="xs" fontWeight="medium" mb={2}>Active Numeric Filters:</Text>
                <Stack gap={1}>
                  {Object.entries(advancedFilters.numericRanges).map(([fieldName, range]) => (
                    <HStack key={fieldName} justify="space-between" fontSize="xs">
                      <Text>
                        {fieldName}: {range.min ?? '∞'} - {range.max ?? '∞'}
                      </Text>
                      <button
                        onClick={() => {
                          const { [fieldName]: _, ...rest } = advancedFilters.numericRanges!;
                          onUpdate({
                            numericRanges: Object.keys(rest).length > 0 ? rest : undefined
                          });
                        }}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #FC8181',
                          fontSize: '10px',
                          backgroundColor: 'transparent',
                          color: '#FC8181',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </HStack>
                  ))}
                </Stack>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Clear all advanced filters */}
        {(advancedFilters.textSearch || advancedFilters.dateRange || advancedFilters.numericRanges) && (
          <button
            onClick={() => onUpdate({ textSearch: undefined, dateRange: undefined, numericRanges: undefined })}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #E53E3E',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: '#E53E3E',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Clear All Advanced Filters
          </button>
        )}
      </VStack>
    </Box>
  );
};

