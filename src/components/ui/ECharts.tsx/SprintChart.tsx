import { ECharts } from "@/components/ui/ECharts.tsx/ECharts.tsx";
import { useState, useEffect } from "react";
import {processBarChartData} from "./createGraphData.js";

export const SprintChart = ({flattenedData, styleOptions}) => {
    const [chartOptions, setChartOptions] = useState(null);
    
    useEffect(()=>{
        const chartOptions = processBarChartData(flattenedData, "Sprint");
        setChartOptions(chartOptions);
    },[flattenedData]);
    return (
        <div className="chartContainer">
        {chartOptions && (
            <ECharts option={chartOptions} style={styleOptions} />
        )}
        </div>
    )
}