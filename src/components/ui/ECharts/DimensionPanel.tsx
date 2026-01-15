import { Box, Text, VStack, HStack } from "@chakra-ui/react";

interface DimensionPanelProps {
  filterableFields: Record<string, string[]>;
  selectedDimensionField: string;
  dimensionValues: string[];
  selectedDimensionValues: string[];
  onDimensionFieldChange: (field: string) => void;
  onDimensionToggle: (value: string) => void;
}

export const DimensionPanel = ({
  filterableFields,
  selectedDimensionField,
  dimensionValues,
  selectedDimensionValues,
  onDimensionFieldChange,
  onDimensionToggle,
}: DimensionPanelProps) => {
  return (
    <Box>
      <Text fontSize="md" fontWeight="semibold" mb={3}>
        Dimensions
      </Text>
      
      <VStack align="stretch" gap={4}>
        {/* Dimension Field Selector */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Select Dimension Field
          </Text>
          <select
            value={selectedDimensionField}
            onChange={(e) => onDimensionFieldChange(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              fontSize: "14px",
              width: "100%",
              maxWidth: "300px",
              backgroundColor: "transparent",
              color: "inherit",
              cursor: "pointer"
            }}
          >
            <option value="labels">Labels</option>
            {Object.keys(filterableFields).sort().map((fieldName) => (
              <option key={fieldName} value={fieldName}>
                {fieldName}
              </option>
            ))}
          </select>
        </Box>

        {/* Dimension Values Checkboxes */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Select Values to Display on Chart
          </Text>
          <Box
            maxH="200px"
            overflowY="auto"
            p={3}
            borderWidth="1px"
            borderRadius="4px"
            borderColor="gray.200"
          >
            <VStack align="stretch" gap={2}>
              {dimensionValues.map((value) => (
                <HStack key={`dimension-${value}`} gap={2}>
                  <input
                    type="checkbox"
                    id={`dimension-value-${value}`}
                    checked={selectedDimensionValues.includes(value)}
                    onChange={() => onDimensionToggle(value)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label 
                    htmlFor={`dimension-value-${value}`}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    {value}
                  </label>
                </HStack>
              ))}
            </VStack>
          </Box>
        </Box>
      </VStack>
    </Box>
  );
};

