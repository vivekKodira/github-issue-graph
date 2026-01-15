import { useState, useMemo } from "react";
import { Box, Text, VStack, Input } from "@chakra-ui/react";

interface TimeEstimationWidgetProps {
  filteredData: unknown[];
  filterableFields: Record<string, string[]>;
  styleOptions?: Record<string, unknown>;
}

export const TimeEstimationWidget = ({
  filteredData,
  filterableFields,
}: TimeEstimationWidgetProps) => {
  const [selectedEstimationField, setSelectedEstimationField] = useState<string>("");
  const [numDevelopers, setNumDevelopers] = useState<number>(1);
  const [outlierThreshold, setOutlierThreshold] = useState<string>("");

  // Filter to only numeric fields (fields that have numeric values)
  const numericFields = useMemo(() => {
    const fields: string[] = [];
    
    if (!filteredData || filteredData.length === 0) {
      return fields;
    }

    // Check each field in filterableFields to see if it contains numeric values
    Object.keys(filterableFields).forEach((fieldName) => {
      // Sample a few issues to check if the field is numeric
      const sampleSize = Math.min(5, filteredData.length);
      let hasNumericValue = false;
      
      for (let i = 0; i < sampleSize; i++) {
        const issue = filteredData[i];
        const value = issue[fieldName] ?? issue.customFields?.[fieldName];
        
        if (value !== null && value !== undefined) {
          const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
          if (!isNaN(numValue) && isFinite(numValue)) {
            hasNumericValue = true;
            break;
          }
        }
      }
      
      if (hasNumericValue) {
        fields.push(fieldName);
      }
    });

    return fields.sort();
  }, [filterableFields, filteredData]);

  // Extract issues with their numeric values
  const issuesWithValues = useMemo(() => {
    if (!selectedEstimationField || !filteredData || filteredData.length === 0) {
      return [];
    }

    const issues: Array<{ issue: unknown; value: number }> = [];
    
    filteredData.forEach((issue) => {
      // Check both direct field and customFields
      const rawValue = (issue as Record<string, unknown>)[selectedEstimationField] 
        ?? (issue as { customFields?: Record<string, unknown> })?.customFields?.[selectedEstimationField];
      
      if (rawValue !== null && rawValue !== undefined) {
        const numValue = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
        if (!isNaN(numValue) && isFinite(numValue)) {
          issues.push({ issue, value: numValue });
        }
      }
    });

    return issues;
  }, [selectedEstimationField, filteredData]);

  // Calculate the estimate
  const estimate = useMemo(() => {
    if (issuesWithValues.length === 0) {
      return null;
    }

    if (numDevelopers < 1) {
      return null;
    }

    const values = issuesWithValues.map(item => item.value);

    // Special case: if only one ticket, return its value (cannot parallelize)
    if (filteredData.length === 1) {
      return values[0] || 0;
    }

    // Multiple tickets: sum all values and divide by number of developers
    const total = values.reduce((sum, val) => sum + val, 0);
    return total / numDevelopers;
  }, [issuesWithValues, filteredData.length, numDevelopers]);

  // Calculate outliers based on user-defined threshold
  const outliers = useMemo(() => {
    if (!selectedEstimationField || issuesWithValues.length === 0) {
      return [];
    }

    const threshold = parseFloat(outlierThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      return []; // No threshold set or invalid
    }

    // Find outliers (values above the threshold)
    const outlierItems = issuesWithValues.filter(item => item.value > threshold);
    
    // Sort by value descending
    return outlierItems.sort((a, b) => b.value - a.value);
  }, [issuesWithValues, selectedEstimationField, outlierThreshold]);

  // Format the field name for display (e.g., "Estimate (days)" -> "days")
  const getUnitFromFieldName = (fieldName: string): string => {
    const lower = fieldName.toLowerCase();
    if (lower.includes('day')) return 'days';
    if (lower.includes('hour')) return 'hours';
    if (lower.includes('week')) return 'weeks';
    if (lower.includes('month')) return 'months';
    return 'units';
  };

  const unit = selectedEstimationField ? getUnitFromFieldName(selectedEstimationField) : 'units';

  return (
    <Box id="time-estimation-widget" mt={4} p={4} borderWidth="1px" borderRadius="8px" borderColor="gray.200">
      <VStack align="stretch" gap={4}>
        <Text fontSize="md" fontWeight="semibold">
          Time Estimation
        </Text>

        {/* Field Selector */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Select Estimation Field
          </Text>
          <select
            value={selectedEstimationField}
            onChange={(e) => setSelectedEstimationField(e.target.value)}
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
            <option value="">-- Select a field --</option>
            {numericFields.map((fieldName) => (
              <option key={fieldName} value={fieldName}>
                {fieldName}
              </option>
            ))}
          </select>
          {numericFields.length === 0 && (
            <Text fontSize="xs" color="gray.400" mt={1}>
              No numeric fields available. Apply filters to see available fields.
            </Text>
          )}
        </Box>

        {/* Number of Developers Input */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Number of Developers
          </Text>
          <Input
            type="number"
            min={1}
            value={numDevelopers}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value) && value >= 1) {
                setNumDevelopers(value);
              } else if (e.target.value === '') {
                setNumDevelopers(1);
              }
            }}
            placeholder="Enter number of developers"
            style={{
              maxWidth: "300px"
            }}
          />
        </Box>

        {/* Outlier Threshold Input */}
        {selectedEstimationField && (
          <Box>
            <Text fontSize="sm" mb={2}>
              Outlier Threshold ({unit})
            </Text>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={outlierThreshold}
              onChange={(e) => {
                setOutlierThreshold(e.target.value);
              }}
              placeholder={`Enter threshold (e.g., 5 for ${unit})`}
              style={{
                maxWidth: "300px"
              }}
            />
            <Text fontSize="xs" color="gray.400" mt={1}>
              Tickets with estimates above this value will be shown as outliers
            </Text>
          </Box>
        )}

        {/* Result Display */}
        {estimate !== null && (
          <Box
            p={4}
            bg="blue.50"
            borderRadius="4px"
            borderWidth="1px"
            borderColor="blue.200"
          >
            <VStack align="stretch" gap={1}>
              <Text fontSize="sm" color="gray.600">
                Estimated Time to Complete:
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="blue.700">
                {estimate.toFixed(2)} {unit}
              </Text>
              {filteredData.length === 1 && (
                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                  Single ticket cannot be parallelized
                </Text>
              )}
              {filteredData.length > 1 && (
                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                  Based on {filteredData.length} tickets with {numDevelopers} developer{numDevelopers !== 1 ? 's' : ''}
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {!selectedEstimationField && (
          <Text fontSize="sm" color="gray.400" fontStyle="italic">
            Select an estimation field to calculate time estimate
          </Text>
        )}

        {selectedEstimationField && estimate === null && filteredData.length > 0 && (
          <Text fontSize="sm" color="orange.400" fontStyle="italic">
            No valid numeric values found in selected field for the filtered issues
          </Text>
        )}

        {filteredData.length === 0 && (
          <Text fontSize="sm" color="gray.400" fontStyle="italic">
            Apply filters to see time estimation for selected issues
          </Text>
        )}

        {/* Outliers Display */}
        {selectedEstimationField && outlierThreshold && outliers.length > 0 && (
          <Box
            p={4}
            bg="orange.50"
            borderRadius="4px"
            borderWidth="1px"
            borderColor="orange.200"
          >
            <VStack align="stretch" gap={2}>
              <Text fontSize="sm" fontWeight="semibold" color="orange.700">
                ⚠️ Outliers Detected ({outliers.length} ticket{outliers.length !== 1 ? 's' : ''})
              </Text>
              <Text fontSize="xs" color="gray.600">
                These tickets have estimates above {parseFloat(outlierThreshold).toFixed(1)} {unit} and may need special attention:
              </Text>
              <VStack align="stretch" gap={1} maxH="200px" overflowY="auto">
                {outliers.map((item, index) => {
                  const issue = item.issue as { title?: string; issue_number?: number; number?: number; id?: string };
                  const title = issue.title || 'Untitled';
                  const issueNumber = issue.issue_number || issue.number || issue.id || 'N/A';
                  return (
                    <Box
                      key={index}
                      p={2}
                      bg="white"
                      borderRadius="2px"
                      borderWidth="1px"
                      borderColor="orange.300"
                    >
                      <Text fontSize="xs" fontWeight="medium" color="orange.800">
                        #{issueNumber}: {title.length > 60 ? `${title.substring(0, 60)}...` : title}
                      </Text>
                      <Text fontSize="xs" color="orange.600" mt={0.5}>
                        {item.value.toFixed(2)} {unit}
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

