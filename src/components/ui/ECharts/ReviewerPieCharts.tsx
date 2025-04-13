import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect, useMemo } from "react";
import { Box, HStack, Text, Select, createListCollection } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js";

interface ReviewComment {
  author: string;
  createdAt: string;
}

interface PullRequest {
  createdAt: string;
  author: string;
  reviewComments: ReviewComment[];
}

export const createReviewerPieChartData = (prs: PullRequest[]) => {
  const reviewerData: Record<string, number> = {};

  prs.forEach((pr) => {
    if (!pr.reviewComments || pr.reviewComments.length === 0) {
      return; // Skip PRs with no review comments
    }

    // Process review comments
    pr.reviewComments.forEach((comment) => {
      // Skip comments from the PR author
      if (comment.author === pr.author) {
        return;
      }

      if (!reviewerData[comment.author]) {
        reviewerData[comment.author] = 0;
      }
      reviewerData[comment.author]++;
    });
  });

  // Convert to series data format
  return Object.entries(reviewerData).map(([reviewer, count]) => ({
    name: reviewer,
    value: count
  }));
};

export const ReviewerPieCharts = ({ flattenedData, styleOptions, searchTerm }) => {
  const [chartOptions, setChartOptions] = useState(pieChartTemplate);
  const [filteredReviewers, setFilteredReviewers] = useState<string[]>([]);
  const [allReviewers, setAllReviewers] = useState<string[]>([]);

  // Create the collection for the Select component
  const collection = useMemo(() => {
    return createListCollection({
      items: allReviewers.map(reviewer => ({
        label: reviewer,
        value: reviewer
      }))
    });
  }, [allReviewers]);

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptions(pieChartTemplate);
      return;
    }

    const pieData = createReviewerPieChartData(flattenedData);
    
    // Update all reviewers list
    const reviewers = pieData.map(item => item.name);
    setAllReviewers(reviewers);
    
    // Filter data based on search term and filtered reviewers
    const filteredData = pieData.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filteredReviewers.length === 0 || 
        filteredReviewers.includes(item.name);
      return matchesSearch && matchesFilter;
    });
    
    const options = JSON.parse(JSON.stringify(pieChartTemplate));
    options.title = {
      text: 'Review Comments by Reviewer',
      left: 'center',
      textStyle: {
        color: '#ffffff'
      }
    };
    options.series = [{
      type: 'pie',
      radius: '50%',
      data: filteredData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }];

    setChartOptions(options);
  }, [flattenedData, searchTerm, filteredReviewers]);

  return (
    <Box>
      <HStack marginBottom={4} gap={4}>
        <Text color="white">Select reviewers:</Text>
        <Select.Root
          multiple
          value={filteredReviewers}
          onValueChange={(details) => setFilteredReviewers(details.value)}
          width="300px"
          collection={collection}
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Select reviewers" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {collection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  {item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </HStack>
      <ECharts option={chartOptions} style={styleOptions} />
    </Box>
  );
}; 