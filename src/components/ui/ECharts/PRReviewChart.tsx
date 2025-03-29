import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";

export const PRReviewChart = ({ prs, styleOptions }) => {
    const [chartOptions, setChartOptions] = useState(null);

    useEffect(() => {
        if (!prs?.length) return;

        // Calculate review times and group by PR size
        const prData = prs.map(pr => {
            const createdAt = new Date(pr.createdAt);
            const completedAt = pr.mergedAt ? new Date(pr.mergedAt) : new Date(pr.closedAt);
            const reviewTime = completedAt - createdAt;
            const size = pr.additions + pr.deletions;
            return {
                reviewTime: reviewTime / (1000 * 60 * 60), // Convert to hours
                size,
                title: pr.title,
                number: pr.number,
                createdAt // Add this to track time
            };
        }).filter(pr => pr.reviewTime > 0); // Filter out invalid dates

        // Sort PRs by creation date for the timeline
        const timelineData = [...prData]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(pr => [pr.createdAt, pr.reviewTime]);

        // Calculate average review time
        const avgReviewTime = prData.reduce((sum, pr) => sum + pr.reviewTime, 0) / prData.length;

        const options = {
            title: {
                text: `PR Size vs Review Time [Average: ${avgReviewTime.toFixed(1)} hours]`,
                
                // left: '15%',
                top: '5%',
                textAlign: 'left',
                textStyle: {
                    color: '#ffffff'
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (Array.isArray(params)) {
                        const scatterPoint = params.find(p => p.seriesType === 'scatter');
                        const linePoint = params.find(p => p.seriesType === 'line');
                        if (scatterPoint) {
                            return `PR #${scatterPoint.data[3]}: ${scatterPoint.data[2]}<br/>
                                    Size: ${scatterPoint.data[0]} changes<br/>
                                    Review Time: ${scatterPoint.data[1].toFixed(1)} hours`;
                        } else if (linePoint) {
                            return `Date: ${new Date(linePoint.data[0]).toLocaleDateString()}<br/>
                                    Review Time: ${linePoint.data[1].toFixed(1)} hours`;
                        }
                    }
                    return '';
                }
            },
            dataZoom: [{
                type: 'slider',
                xAxisIndex: 1,  // Apply to the timeline x-axis
                show: true,
                start: 0,
                end: 100,
                bottom: '5%',
                height: 20,
                borderColor: '#ccc',
                textStyle: {
                    color: '#666'
                },
                handleStyle: {
                    color: '#999'
                }
            }, {
                type: 'inside',  // Enable mouse wheel zoom
                xAxisIndex: 1,
                start: 0,
                end: 100
            }],
            grid: [{
                left: '10%',
                right: '10%',
                top: '15%',
                height: '35%'
            }, {
                left: '10%',
                right: '10%',
                top: '60%',
                height: '30%',
                bottom: '15%'  // Increased to make room for slider
            }],
            xAxis: [{
                name: 'PR Size (changes)',
                type: 'log',
                axisLabel: {
                    formatter: (value) => value.toLocaleString()
                },
                splitLine: { show: true },
                axisPointer: { show: true },
                min: 1,
                gridIndex: 0
            }, {
                type: 'time',
                name: 'Time',
                gridIndex: 1
            }],
            yAxis: [{
                name: 'Review Time (hours)',
                type: 'log',
                gridIndex: 0
            }, {
                name: 'Review Time (hours)',
                type: 'value',
                gridIndex: 1
            }],
            series: [{
                name: 'PR Size vs Review Time',
                type: 'scatter',
                data: prData.map(pr => [pr.size, pr.reviewTime, pr.title, pr.number]),
                symbolSize: 10,
                xAxisIndex: 0,
                yAxisIndex: 0
            }, {
                name: 'Review Time Trend',
                type: 'line',
                data: timelineData,
                symbol: 'none',
                smooth: true,
                xAxisIndex: 1,
                yAxisIndex: 1
            }],
            legend: {
                textStyle: {
                    color: '#ffffff'
                },
                data: ['Changes Requested', 'Approved', 'Commented']
            }
        };

        setChartOptions(options);
    }, [prs]);

    return (
        <div >
            {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
        </div>
    );
}; 