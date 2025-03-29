import { Box, Text, Stack } from "@chakra-ui/react";
import { memo } from "react";
import { LuTrendingUp } from "react-icons/lu";

interface Insight {
  text: string;
  icon: React.ComponentType;
}

interface InsightsProps {
  insights: Insight[];
}

export const Insights = memo(({ insights }: InsightsProps) => {
  return (
    <Box p={6} borderRadius="lg" borderWidth="1px" width="100%">
      <Text fontSize="xl" mb={4} color="white">Key Insights</Text>
      {insights.length > 0 ? (
        <Stack gap={3}>
          {insights.map((insight, index) => (
            <Box 
              key={index} 
              display="flex" 
              alignItems="center"
              color={insight.icon === LuTrendingUp ? '#48BB78' : '#F56565'}
            >
              <Box as={insight.icon} style={{ color: insight.icon === LuTrendingUp ? '#48BB78' : '#ECC94B', marginRight: '8px' }} />
              {insight.text}
            </Box>
          ))}
        </Stack>
      ) : (
        <Text color="white">No insights available yet. Generate some data to see insights.</Text>
      )}
    </Box>
  );
}); 