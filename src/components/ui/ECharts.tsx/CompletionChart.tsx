import { LiquidFillGauge } from "./LiquidFillGuage";
import { useState, useEffect } from "react";
import { Heading } from "@chakra-ui/react";


export const CompletionChart = ({title, data, styleOptions }) => {
    const [chartOptions, setChartOptions] = useState(null);
    
    useEffect(()=>{
        const chartOptions = {
            series: [{
                type: 'liquidFill',
                data: [data]
            }]
        };
        setChartOptions(chartOptions);
    },[data]);
    return (
        <div className="chartContainer">
        <Heading>{title}</Heading>
        {chartOptions && (
            <LiquidFillGauge option={chartOptions} style={styleOptions} />
        )}
        </div>
    )
}