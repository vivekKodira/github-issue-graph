import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Box, HStack, Text, Select, createListCollection } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js";
import { CustomCheckboxIndicator } from "./CustomCheckboxIndicator";
import { ErrorBoundary } from "./ErrorBoundary";
import { AverageByPersonTable } from "./AverageByPersonTable";
import { DateRangeFilterStrip } from "./DateRangeFilterStrip";

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
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [dateFilteredData, setDateFilteredData] = useState<PullRequest[]>([]);

  const handleFilteredData = useCallback((filtered: PullRequest[]) => {
    setDateFilteredData(filtered);
  }, []);

  // Initialize filtered reviewers when allReviewers changes
  useEffect(() => {
    if (allReviewers.length > 0 && filteredReviewers.length === 0) {
      setFilteredReviewers(allReviewers);
    }
  }, [allReviewers]);

  // Create the collection for the Select component
  const collection = useMemo(() => {
    return createListCollection({
      items: allReviewers.map(reviewer => ({
        label: reviewer,
        value: reviewer
      }))
    });
  }, [allReviewers]);

  const dataToUse = dateFilteredData.length > 0 ? dateFilteredData : (flattenedData ?? []);

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptions(pieChartTemplate);
      return;
    }

    const pieData = createReviewerPieChartData(dataToUse);
    
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
    
    const total = filteredData.reduce((sum, d) => sum + d.value, 0);
    const pct: Record<string, number> = {};
    filteredData.forEach((d) => {
      pct[d.name] = total ? (d.value / total) * 100 : 0;
    });
    setPercentages(pct);

    const options = JSON.parse(JSON.stringify(pieChartTemplate));
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
  }, [flattenedData, dateFilteredData, searchTerm, filteredReviewers]);

  const mainChartHeight = 350;
  return (
    <HStack align="flex-start" width="100%">
      <Box flex={1} minWidth={0} display="flex" flexDirection="column" gap={0}>
        <h3 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '18px', fontWeight: 'bold' }}>Review Comments by Reviewer</h3>
        {flattenedData?.length ? (
          <Box flexShrink={0} width="100%">
            <DateRangeFilterStrip
              data={flattenedData as unknown as Record<string, unknown>[]}
              dateField="createdAt"
              onFilteredData={handleFilteredData as (filtered: Record<string, unknown>[]) => void}
              styleOptions={styleOptions}
            />
          </Box>
        ) : null}
        <Box flexShrink={0} marginBottom={4}>
          <HStack gap={4}>
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
                      <Select.ItemIndicator>
                        {({ "data-state": state }) => (
                          <CustomCheckboxIndicator checked={state === "checked"} />
                        )}
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </HStack>
        </Box>
        <Box width="100%" height={`${mainChartHeight}px`} minHeight={`${mainChartHeight}px`} overflow="hidden" flexShrink={0}>
          <ErrorBoundary chartName="Reviewer Pie">
            <ECharts option={chartOptions} style={{ width: '100%', height: mainChartHeight }} />
          </ErrorBoundary>
        </Box>
        <style>
          {`
            [data-state="checked"] .reviewer-checkbox-indicator {
              background: #3182ce !important;
              border-color: #63b3ed !important;
            }
            [data-state="checked"] .custom-checkbox-checkmark {
              display: block !important;
            }
            [data-state="unchecked"] .reviewer-checkbox-indicator {
              background: #2d3748 !important;
              border-color: #718096 !important;
            }
            [data-state="unchecked"] .custom-checkbox-checkmark {
              display: none !important;
            }
          `}
        </style>
      </Box>
      <AverageByPersonTable
        personLabel="Reviewer"
        valueLabel="%"
        averages={percentages}
        valueFormat={(n) => `${Number(n).toFixed(1)}%`}
        title="Review Comments by Reviewer"
      />
    </HStack>
  );
}; 