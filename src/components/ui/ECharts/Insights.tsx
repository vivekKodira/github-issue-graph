import { Box, Text, Stack } from "@chakra-ui/react";
import { memo } from "react";
import { LuTrendingUp, LuTrendingDown } from "react-icons/lu";

interface Insight {
  text: string;
  severity: number; // -5 to 5
}

interface InsightsProps {
  insights: Insight[];
}

export const Insights = memo(({ insights }: InsightsProps) => {
  // Helper function to calculate color based on severity
  const getColorForSeverity = (severity: number) => {
    // Ensure severity is within bounds
    const boundedSeverity = Math.max(-5, Math.min(5, severity));
    
    if (boundedSeverity === 0) return '#FFFFFF'; // Neutral
    
    if (boundedSeverity > 0) {
      // Interpolate between white and green
      const intensity = boundedSeverity / 5;
      return `rgba(72, 187, 120, ${intensity})`; // #48BB78 is Chakra's green.500
    } else {
      // Interpolate between white and red
      const intensity = Math.abs(boundedSeverity) / 5;
      return `rgba(245, 101, 101, ${intensity})`; // #F56565 is Chakra's red.500
    }
  };

  // Helper function to determine which icon to use
  const getIconForSeverity = (severity: number) => {
    return severity >= 0 ? LuTrendingUp : LuTrendingDown;
  };

  return (
    <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
      <Text fontSize="xl" mb={4} color="white">Key Insights</Text>
      {insights.length > 0 ? (
        <Stack gap={3}>
          {insights.map((insight, index) => {
            const InsightIcon = getIconForSeverity(insight.severity);
            const color = getColorForSeverity(insight.severity);
            
            return (
              <Box 
                key={index} 
                display="flex" 
                alignItems="center"
                color={color}
              >
                <Box as={InsightIcon} style={{ marginRight: '8px' }} />
                {insight.text}
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Text color="white">No insights available yet. Generate some data to see insights.</Text>
      )}
    </Box>
  );
}); 