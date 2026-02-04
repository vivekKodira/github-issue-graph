import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';

import { TaskFormat } from '@/util/taskConverter';
import { sortSprintsNumerically, NO_SPRINT_LABEL } from '@/util/commonFunctions';
import { Insight } from './types';
import { ErrorBoundary } from "./ErrorBoundary";

interface SprintData {
    sprint: string;
    tasks: TaskFormat[];
}



export const SprintVelocityChart = ({ flattenedData, styleOptions, onInsightsGenerated }) => {
    const { projectKeys } = useProjectKeys();
    const [chartOptions, setChartOptions] = useState(null);
    const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);

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

        // Process tasks by sprint (include no-sprint as NO_SPRINT_LABEL)
        flattenedData.forEach(task => {
            if (task.Status !== "Done") return;

            const sprint = task[projectKeys[PROJECT_KEYS.SPRINT].value] || NO_SPRINT_LABEL;
            sprints.add(sprint);
            if (!sprintData[sprint]) {
                sprintData[sprint] = {
                    sprint: sprint,
                    tasks: []
                };
            }
            sprintData[sprint].tasks.push(task);
        });

        const namedSprints = Array.from(sprints).filter(s => s !== NO_SPRINT_LABEL);
        sortSprintsNumerically(namedSprints);
        const sortedSprints = sprints.has(NO_SPRINT_LABEL) ? [...namedSprints, NO_SPRINT_LABEL] : namedSprints;

        // Generate insights from chart data (exclude "No Sprint" - compare only last two named sprints)
        const insights: Insight[] = [];
        if (namedSprints.length >= 2) {
            const currentSprint = namedSprints[namedSprints.length - 1];
            const previousSprint = namedSprints[namedSprints.length - 2];

            // Check completed tasks
            const currentTasks = sprintData[currentSprint].tasks.length;
            const previousTasks = sprintData[previousSprint].tasks.length;
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
            const currentEffort = sprintData[currentSprint].tasks.reduce((total, task) => total + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0);
            const previousEffort = sprintData[previousSprint].tasks.reduce((total, task) => total + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0);
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
                    data: sortedSprints.map(sprint => sprintData[sprint].tasks.length)
                },
                {
                    name: 'Effort (days)',
                    type: 'line',
                    yAxisIndex: 1,
                    data: sortedSprints.map(sprint => sprintData[sprint].tasks.reduce((total, task) => total + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0))
                }
            ]
        };

        setChartOptions(options);
    }, [flattenedData, projectKeys, onInsightsGenerated, previousInsights]);

    return (
        <div>
            {chartOptions && (
                <ErrorBoundary chartName="Sprint Velocity">
                    <ECharts option={chartOptions} style={styleOptions} />
                </ErrorBoundary>
            )}
        </div>
    );
}; 
