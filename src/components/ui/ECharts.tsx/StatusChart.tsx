import { ECharts } from "@/components/ui/ECharts.tsx/ECharts.tsx";
import { useState, useEffect } from "react";
import {processBarChartData} from "./createGraphData.js";

export const StatusChart = ({flattenedData, styleOptions}) => {
    const [chartOptions, setChartOptions] = useState(null);
    
    useEffect(()=>{
        const chartOptions = processBarChartData(flattenedData, "Status");
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