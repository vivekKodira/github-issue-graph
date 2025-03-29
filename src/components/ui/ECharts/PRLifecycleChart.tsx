import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";

export const PRLifecycleChart = ({ prs, styleOptions }) => {
    const [chartOptions, setChartOptions] = useState(null);

    useEffect(() => {
        if (!prs?.length) return;

        // Calculate metrics
        const metrics = prs.reduce((acc, pr) => {
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
    }, [prs]);

    return (
        <div >
            {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
        </div>
    );
}; 