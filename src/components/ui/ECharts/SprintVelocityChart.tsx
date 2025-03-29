import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { LuTrendingDown } from "react-icons/lu";

export const SprintVelocityChart = ({ flattenedData, prs, styleOptions, onInsightsGenerated }) => {
    const { projectKeys } = useProjectKeys();
    const [chartOptions, setChartOptions] = useState(null);

    // Add effect for insights generation
    useEffect(() => {
        if (!flattenedData?.length) return;

        const sprintData = {};
        const sprints = new Set();

        // Process tasks by sprint
        flattenedData.forEach(task => {
            if (task.Status !== "Done") return;
            
            const sprint = task[projectKeys[PROJECT_KEYS.SPRINT].value];
            if (!sprint) return;
            
            sprints.add(sprint);
            if (!sprintData[sprint]) {
                sprintData[sprint] = {
                    completedTasks: 0,
                    effort: 0
                };
            }
            
            sprintData[sprint].completedTasks++;
            sprintData[sprint].effort += task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value] || 0;
        });

        const sortedSprints = Array.from(sprints).sort();
        
        // Generate insights from chart data
        const insights = [];
        if (sortedSprints.length >= 2) {
            const currentSprint = sortedSprints[sortedSprints.length - 1];
            const previousSprint = sortedSprints[sortedSprints.length - 2];
            
            // Check completed tasks
            const currentTasks = sprintData[currentSprint].completedTasks;
            const previousTasks = sprintData[previousSprint].completedTasks;
            if (currentTasks < previousTasks) {
                const decrease = ((previousTasks - currentTasks) / previousTasks * 100).toFixed(1);
                insights.push({
                    text: `Sprint velocity decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentTasks} vs ${previousTasks} tasks)`,
                    icon: LuTrendingDown
                });
            }
            
            // Check effort
            const currentEffort = sprintData[currentSprint].effort;
            const previousEffort = sprintData[previousSprint].effort;
            if (currentEffort < previousEffort) {
                const decrease = ((previousEffort - currentEffort) / previousEffort * 100).toFixed(1);
                insights.push({
                    text: `Sprint effort decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentEffort.toFixed(1)} vs ${previousEffort.toFixed(1)} days)`,
                    icon: LuTrendingDown
                });
            }
        }

        if (onInsightsGenerated) {
            onInsightsGenerated(insights);
        }
    }, [flattenedData, projectKeys, onInsightsGenerated]);

    useEffect(() => {
        if (!flattenedData?.length) return;

        // Group tasks by sprint
        const sprintData = flattenedData.reduce((acc, task) => {
            const sprint = task[projectKeys[PROJECT_KEYS.SPRINT].value];
            // Skip tasks with no sprint
            if (!sprint) return acc;
            
            if (!acc[sprint]) {
                acc[sprint] = {
                    completedTasks: 0,
                    effort: 0
                };
            }
            if (task.Status === 'Done') {
                acc[sprint].completedTasks++;
                acc[sprint].effort += task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value] || 0;
            }
            return acc;
        }, {});

        const sprints = Object.keys(sprintData).sort();
        
        const options = {
            title: {
                text: 'Sprint Velocity Trends',
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
                data: ['Completed Tasks', 'Effort (days)']
            },
            xAxis: {
                type: 'category',
                data: sprints
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Count',
                    position: 'left'
                },
                {
                    type: 'value',
                    name: 'Effort',
                    position: 'right'
                }
            ],
            series: [
                {
                    name: 'Completed Tasks',
                    type: 'bar',
                    data: sprints.map(sprint => sprintData[sprint].completedTasks)
                },
                {
                    name: 'Effort (days)',
                    type: 'line',
                    yAxisIndex: 1,
                    data: sprints.map(sprint => sprintData[sprint].effort)
                }
            ]
        };

        setChartOptions(options);
    }, [flattenedData, projectKeys]);

    return (
        <div >
            {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
        </div>
    );
}; 