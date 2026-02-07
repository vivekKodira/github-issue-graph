import { ECharts } from "./ECharts";
import { useState, useEffect, useCallback } from "react";
import { Box } from "@chakra-ui/react";
import { ErrorBoundary } from "./ErrorBoundary";
import { DateRangeFilterStrip } from "./DateRangeFilterStrip";

export const PRLifecycleChart = ({ prs, styleOptions }) => {
    const [chartOptions, setChartOptions] = useState(null);
    const [dateFilteredData, setDateFilteredData] = useState([]);

    const handleFilteredData = useCallback((filtered: unknown[]) => {
        setDateFilteredData(filtered as typeof prs);
    }, []);

    const dataToUse = dateFilteredData.length > 0 ? dateFilteredData : (prs ?? []);

    useEffect(() => {
        if (!dataToUse?.length) return;

        // Calculate metrics
        const metrics = dataToUse.reduce((acc, pr) => {
            const state = pr.state.toLowerCase();
            acc.total++;
            acc[state] = (acc[state] || 0) + 1;
            
            if (pr.reviewComments.length > 0) {
                acc.withComments++;
                acc.totalComments += pr.reviewComments.length;
            }
            
            return acc;
        }, { total: 0, open: 0, closed: 0, merged: 0, withComments: 0, totalComments: 0 });

        const options = {
            title: {
                text: 'PR Lifecycle Analysis',
                textStyle: {
                    color: '#ffffff'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'value'
            },
            yAxis: {
                type: 'category',
                data: ['Total PRs', 'Merged', 'Closed', 'Open', 'With Comments', 'Avg Comments/PR']
            },
            series: [{
                name: 'Count',
                type: 'bar',
                data: [
                    metrics.total,
                    metrics.merged || 0,
                    metrics.closed || 0,
                    metrics.open || 0,
                    metrics.withComments,
                    +(metrics.totalComments / metrics.total).toFixed(1)
                ]
            }]
        };

        setChartOptions(options);
    }, [dataToUse]);

    const chartHeight = 350;
    return (
        <Box display="flex" flexDirection="column" width="100%">
            {prs?.length ? (
                <Box flexShrink={0} width="100%" marginBottom={4}>
                    <DateRangeFilterStrip
                        data={prs as unknown as Record<string, unknown>[]}
                        dateField="createdAt"
                        onFilteredData={handleFilteredData as (filtered: Record<string, unknown>[]) => void}
                        styleOptions={styleOptions}
                    />
                </Box>
            ) : null}
            {chartOptions && (
                <Box width="100%" height={`${chartHeight}px`} minHeight={`${chartHeight}px`} overflow="hidden" flexShrink={0}>
                    <ErrorBoundary chartName="PR Lifecycle">
                        <ECharts option={chartOptions} style={{ width: '100%', height: chartHeight }} />
                    </ErrorBoundary>
                </Box>
            )}
        </Box>
    );
}; 