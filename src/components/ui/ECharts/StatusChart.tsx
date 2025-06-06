import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect } from "react";
import {processBarChartData} from "./createGraphData.js";
import { useProjectKeys } from '@/context/ProjectKeysContext';

export const StatusChart = ({flattenedData, styleOptions}) => {
    const [chartOptions, setChartOptions] = useState(null);
    const { projectKeys } = useProjectKeys();

    useEffect(()=>{
        const chartOptions = processBarChartData(flattenedData, "Status", projectKeys);
        if(chartOptions) {
            setChartOptions(chartOptions);
        }
    },[flattenedData, projectKeys]);
    return (
        <div >
        {chartOptions && (
            <ECharts option={chartOptions} style={styleOptions} />
        )}
        </div>
    )
}