import { useState } from "react";
import { Box, Text, VStack, HStack, Textarea } from "@chakra-ui/react";
import { QUERY_EXAMPLES } from "@/util/mangoQueryBuilder";

interface ExpertQueryPanelProps {
  generatedQuery: any;
  customQuery: any;
  queryValidation: { valid: boolean; error?: string };
  onApplyCustomQuery: (query: any) => void;
}

export const ExpertQueryPanel = ({
  generatedQuery,
  customQuery,
  queryValidation,
  onApplyCustomQuery,
}: ExpertQueryPanelProps) => {
  const [showExamples, setShowExamples] = useState(false);
  const [queryText, setQueryText] = useState(
    customQuery ? JSON.stringify(customQuery, null, 2) : ''
  );

  const handleApplyQuery = () => {
    try {
      const parsed = JSON.parse(queryText);
      onApplyCustomQuery(parsed);
    } catch (error) {
      onApplyCustomQuery({ _error: 'Invalid JSON' });
    }
  };

  const loadExample = (exampleQuery: any) => {
    setQueryText(JSON.stringify(exampleQuery, null, 2));
    setShowExamples(false);
  };

  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Text fontSize="md" fontWeight="semibold">
          💡 Expert Mode: Mango Query
        </Text>
        <button
          onClick={() => setShowExamples(!showExamples)}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: '1px solid #3182CE',
            fontSize: '12px',
            backgroundColor: 'transparent',
            color: '#3182CE',
            cursor: 'pointer'
          }}
        >
          {showExamples ? 'Hide' : 'Show'} Examples
        </button>
      </HStack>

      <VStack align="stretch" gap={4}>
        {/* Query Examples */}
        {showExamples && (
          <Box 
            p={3} 
            borderWidth="1px" 
            borderRadius="4px" 
            borderColor="#3182CE"
            style={{ backgroundColor: '#EBF8FF' }}
          >
            <Text fontSize="sm" fontWeight="medium" mb={2} style={{ color: '#1A365D' }}>
              Example Queries:
            </Text>
            <VStack align="stretch" gap={2}>
              {Object.entries(QUERY_EXAMPLES).map(([name, query]) => (
                <Box key={name}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" fontWeight="medium" style={{ color: '#1A365D' }}>
                      {name}
                    </Text>
                    <button
                      onClick={() => loadExample(query)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #3182CE',
                        fontSize: '10px',
                        backgroundColor: '#3182CE',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Load
                    </button>
                  </HStack>
                  <Box
                    as="pre"
                    fontSize="10px"
                    p={2}
                    borderRadius="2px"
                    style={{ 
                      backgroundColor: '#2D3748',
                      color: '#E2E8F0',
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(query, null, 2)}
                  </Box>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Show Generated Query */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="medium">
              📋 Generated Query (from UI filters)
            </Text>
            <button
              onClick={() => setQueryText(JSON.stringify(generatedQuery, null, 2))}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #48BB78',
                fontSize: '11px',
                backgroundColor: 'transparent',
                color: '#48BB78',
                cursor: 'pointer'
              }}
            >
              Copy to Editor
            </button>
          </HStack>
          <Box
            as="pre"
            fontSize="12px"
            p={3}
            borderRadius="4px"
            borderWidth="1px"
            borderColor="gray.200"
            style={{ 
              backgroundColor: '#2D3748',
              color: '#E2E8F0',
              overflow: 'auto',
              maxHeight: '200px'
            }}
          >
            {Object.keys(generatedQuery).length > 0
              ? JSON.stringify(generatedQuery, null, 2)
              : '{}  // No filters applied'}
          </Box>
        </Box>

        {/* Custom Query Editor */}
        <Box>
          <Text fontSize="sm" mb={2} fontWeight="medium">
            ✏️ Edit Query Directly
          </Text>
          <Text fontSize="xs" color="gray.500" mb={2}>
            Enter a valid Mango query selector in JSON format. Learn more about{' '}
            <a 
              href="https://rxdb.info/rx-query.html" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#3182CE', textDecoration: 'underline' }}
            >
              RxDB Query Syntax
            </a>
          </Text>
          <Textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder='{\n  "$and": [\n    { "Status": { "$in": ["Todo"] } }\n  ]\n}'
            rows={12}
            fontFamily="monospace"
            fontSize="12px"
            style={{
              backgroundColor: '#2D3748',
              color: '#E2E8F0',
              border: queryValidation.valid ? '1px solid #E2E8F0' : '2px solid #FC8181'
            }}
          />
          
          {!queryValidation.valid && (
            <Text fontSize="xs" color="red.500" mt={2}>
              ⚠️ {queryValidation.error || 'Invalid query'}
            </Text>
          )}

          <HStack mt={3} gap={2}>
            <button
              onClick={handleApplyQuery}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '14px',
                backgroundColor: '#3182CE',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Apply Custom Query
            </button>
            
            <button
              onClick={() => {
                setQueryText('');
                onApplyCustomQuery(null);
              }}
              style={{
                flex: 1,
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
              Clear Custom Query
            </button>
          </HStack>
        </Box>

        {/* Query Tips */}
        <Box 
          p={3} 
          borderWidth="1px" 
          borderRadius="4px" 
          borderColor="#805AD5"
          style={{ backgroundColor: '#FAF5FF' }}
        >
          <Text fontSize="xs" fontWeight="medium" mb={2} style={{ color: '#44337A' }}>
            💡 Quick Tips:
          </Text>
          <VStack align="stretch" gap={1} fontSize="xs" style={{ color: '#553C9A' }}>
            <Text>• Use <code>$and</code> / <code>$or</code> for combining conditions</Text>
            <Text>• Use <code>$in</code> for matching multiple values</Text>
            <Text>• Use <code>$regex</code> for text search (case-insensitive: add <code>$options: 'i'</code>)</Text>
            <Text>• Use <code>$gt</code>, <code>$gte</code>, <code>$lt</code>, <code>$lte</code> for ranges</Text>
            <Text>• Use <code>$elemMatch</code> for array fields like labels</Text>
            <Text>• Access custom fields with <code>customFields.FieldName</code></Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

