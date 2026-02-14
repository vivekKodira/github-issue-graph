import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Box, HStack, Text, Select, createListCollection } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js";
import { CustomCheckboxIndicator } from "./CustomCheckboxIndicator";
import { ErrorBoundary } from "./ErrorBoundary";
import { AverageByPersonTable } from "./AverageByPersonTable";
import { DateRangeFilterStrip } from "./DateRangeFilterStrip";
import { createReviewerPieChartData } from '@/util/chartDataGenerators/reviewerPieChartData';

export { createReviewerPieChartData } from '@/util/chartDataGenerators/reviewerPieChartData';

interface ReviewComment {
  author: string;
  createdAt: string;
}

interface PullRequest {
  createdAt: string;
  author: string;
  reviewComments: ReviewComment[];
}

export const ReviewerPieCharts = ({ flattenedData, styleOptions, searchTerm }) => {
  const [chartOptions, setChartOptions] = useState(pieChartTemplate);
  const [filteredReviewers, setFilteredReviewers] = useState<string[]>([]);
  const [allReviewers, setAllReviewers] = useState<string[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [dateFilteredData, setDateFilteredData] = useState<PullRequest[]>([]);

  const handleFilteredData = useCallback((filtered: PullRequest[]) => {
    setDateFilteredData(filtered);
  }, []);

  // Create the collection for the Select component
  const collection = useMemo(() => {
    return createListCollection({
      items: allReviewers.map(reviewer => ({
        label: reviewer,
        value: reviewer
      }))
    });
  }, [allReviewers]);

  // Step 1: Calculate pie data and extract all reviewers (no dependency on filteredReviewers)
  useEffect(() => {
    if (!flattenedData?.length) {
      setPieData([]);
      setAllReviewers([]);
      setChartOptions(pieChartTemplate);
      return;
    }

    const dataToUse = dateFilteredData.length > 0 ? dateFilteredData : flattenedData;
    const data = createReviewerPieChartData(dataToUse);
    setPieData(data);

    // Update all reviewers list only if it changed
    const reviewers = data.map(item => item.name);
    setAllReviewers(prev => {
      const hasChanged = prev.length !== reviewers.length ||
        !prev.every((r, i) => r === reviewers[i]);
      return hasChanged ? reviewers : prev;
    });
  }, [flattenedData, dateFilteredData]);

  // Step 2: Initialize filtered reviewers when allReviewers changes (one-time)
  useEffect(() => {
    if (allReviewers.length > 0 && filteredReviewers.length === 0) {
      setFilteredReviewers(allReviewers);
    }
  }, [allReviewers]);

  // Step 3: Apply filters and update chart (depends on pieData, filteredReviewers, searchTerm)
  useEffect(() => {
    if (pieData.length === 0) {
      setChartOptions(pieChartTemplate);
      return;
    }

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
  }, [pieData, filteredReviewers, searchTerm]);

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