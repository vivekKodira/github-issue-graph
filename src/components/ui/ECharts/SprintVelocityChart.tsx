import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';

interface SprintData {
    completedTasks: number;
    effort: number;
}

interface SprintInsight {
    text: string;
    severity: number;
}

export const SprintVelocityChart = ({ flattenedData, styleOptions, onInsightsGenerated }) => {
    const { projectKeys } = useProjectKeys();
    const [chartOptions, setChartOptions] = useState(null);
    const [previousInsights, setPreviousInsights] = useState<SprintInsight[]>([]);

    useEffect(() => {
        if (!flattenedData?.length) {
            setChartOptions(null);
            if (onInsightsGenerated) {
                onInsightsGenerated([]);
            }
            return;
        }

        const sprintData: Record<string, SprintData> = {};
        const sprints = new Set<string>();

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
            sprintData[sprint].effort += Number(task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value]) || 0;
        });

        const sortedSprints = Array.from(sprints).sort();
        
        // Generate insights from chart data
        const insights: SprintInsight[] = [];
        if (sortedSprints.length >= 2) {
            const currentSprint = sortedSprints[sortedSprints.length - 1];
            const previousSprint = sortedSprints[sortedSprints.length - 2];
            
            // Check completed tasks
            const currentTasks = sprintData[currentSprint].completedTasks;
            const previousTasks = sprintData[previousSprint].completedTasks;
            if (currentTasks < previousTasks) {
                const decrease = ((previousTasks - currentTasks) / previousTasks * 100).toFixed(1);
                // Calculate severity based on percentage decrease
                const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20))); // -1 to -5 based on 20% intervals
                insights.push({
                    text: `Sprint velocity decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentTasks} vs ${previousTasks} tasks)`,
                    severity
                });
            }
            
            // Check effort
            const currentEffort = sprintData[currentSprint].effort;
            const previousEffort = sprintData[previousSprint].effort;
            if (currentEffort < previousEffort) {
                const decrease = ((previousEffort - currentEffort) / previousEffort * 100).toFixed(1);
                // Calculate severity based on percentage decrease
                const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20))); // -1 to -5 based on 20% intervals
                insights.push({
                    text: `Sprint effort decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentEffort.toFixed(1)} vs ${previousEffort.toFixed(1)} days)`,
                    severity
                });
            }
        }

        // Only update insights if they've changed
        if (onInsightsGenerated && JSON.stringify(insights) !== JSON.stringify(previousInsights)) {
            onInsightsGenerated(insights);
            setPreviousInsights(insights);
        }

        // Create chart options
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
                data: sortedSprints
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
                    data: sortedSprints.map(sprint => sprintData[sprint].completedTasks)
                },
                {
                    name: 'Effort (days)',
                    type: 'line',
                    yAxisIndex: 1,
                    data: sortedSprints.map(sprint => sprintData[sprint].effort)
                }
            ]
        };

        setChartOptions(options);
    }, [flattenedData, projectKeys, onInsightsGenerated, previousInsights]);

    return (
        <div>
            {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
        </div>
    );
}; 