import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect, useCallback } from "react";
import { Box } from "@chakra-ui/react";
import {processBarChartData} from "./createGraphData.js";
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { ErrorBoundary } from "./ErrorBoundary";
import { DateRangeFilterStrip } from "./DateRangeFilterStrip";

export const StatusChart = ({flattenedData, styleOptions}) => {
    const [chartOptions, setChartOptions] = useState(null);
    const { projectKeys } = useProjectKeys();
    const [dateFilteredData, setDateFilteredData] = useState<unknown[]>([]);

    const handleFilteredData = useCallback((filtered: unknown[]) => {
        setDateFilteredData(filtered);
    }, []);

    const dataToUse = dateFilteredData.length > 0 ? dateFilteredData : (flattenedData ?? []);

    useEffect(()=>{
        const chartOptions = processBarChartData(dataToUse, "Status", projectKeys);
        if(chartOptions) {
            setChartOptions(chartOptions);
        }
    },[dataToUse, projectKeys]);
    const chartHeight = 350;
    return (
        <Box display="flex" flexDirection="column" width="100%">
        {flattenedData?.length ? (
            <Box flexShrink={0} width="100%" marginBottom={4}>
                <DateRangeFilterStrip
                    data={flattenedData as Record<string, unknown>[]}
                    dateField="createdAt"
                    onFilteredData={handleFilteredData as (filtered: Record<string, unknown>[]) => void}
                    styleOptions={styleOptions}
                />
            </Box>
        ) : null}
        {chartOptions && (
            <Box width="100%" height={`${chartHeight}px`} minHeight={`${chartHeight}px`} overflow="hidden" flexShrink={0}>
                <ErrorBoundary chartName="Status">
                    <ECharts option={chartOptions} style={{ width: '100%', height: chartHeight }} />
                </ErrorBoundary>
            </Box>
        )}
        </Box>
    )
}