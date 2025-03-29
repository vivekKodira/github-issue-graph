import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";

export const CodeChurnChart = ({ prs, styleOptions }) => {
    const [chartOptions, setChartOptions] = useState(null);

    useEffect(() => {
        if (!prs?.length) return;

        // Helper function to get the month period
        const getMonthPeriod = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        // Group PRs by months and calculate churn
        const churnData = prs.reduce((acc, pr) => {
            const period = getMonthPeriod(new Date(pr.createdAt));
            if (!acc[period]) {
                acc[period] = {
                    additions: 0,
                    deletions: 0,
                    files: 0
                };
            }
            acc[period].additions += pr.additions;
            acc[period].deletions += pr.deletions;
            acc[period].files += pr.changedFiles;
            return acc;
        }, {});

        const periods = Object.keys(churnData).sort();

        // Format period labels to be more readable
        const formatPeriod = (dateStr) => {
            const [year, month] = dateStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString(undefined, { 
                year: 'numeric',
                month: 'short'
            });
        };

        const options = {
            title: {
                text: 'Code Churn Analysis',
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
            legend: {
                textStyle: {
                    color: '#ffffff'
                },
                data: ['Additions', 'Deletions']
            },
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    start: 0,
                    end: 100,
                    bottom: 10,
                    height: 30,
                    borderColor: '#ccc',
                    textStyle: {
                        color: '#ffffff'
                    },
                    handleStyle: {
                        color: '#666'
                    }
                },
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                }
            ],
            grid: {
                left: '10%',
                right: '10%',
                bottom: '15%',  // Make room for the slider
                top: '15%'
            },
            xAxis: {
                type: 'category',
                data: periods.map(formatPeriod),
                axisLabel: {
                    color: '#ffffff'
                }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Lines',
                    position: 'left',
                    axisLabel: {
                        color: '#ffffff'
                    }
                },
                {
                    type: 'value',
                    name: 'Files',
                    position: 'right',
                    axisLabel: {
                        color: '#ffffff'
                    }
                }
            ],
            series: [
                {
                    name: 'Additions',
                    type: 'line',
                    data: periods.map(period => churnData[period].additions)
                },
                {
                    name: 'Deletions',
                    type: 'line',
                    data: periods.map(period => churnData[period].deletions)
                },
                {
                    name: 'Files Changed',
                    type: 'line',
                    yAxisIndex: 1,
                    data: periods.map(period => churnData[period].files)
                }
            ]
        };

        setChartOptions(options);
    }, [prs]);

    return (
        <div>
            {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
        </div>
    );
}; 