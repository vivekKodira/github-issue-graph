import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { Box } from "@chakra-ui/react";
import { TaskFormat } from '@/util/taskConverter';
import { Insight } from './types';

interface SprintData {
    sprint: string;
    tasks: TaskFormat[];
}

export const createEffortPredictionChartData = (tasks: TaskFormat[], projectKeys: any) => {
    // ... existing code ...
};

export const EffortPredictionChart = ({ flattenedData, styleOptions, onInsightsGenerated, plannedEffortForProject }) => {
    const { projectKeys } = useProjectKeys();
    const [chartOptions, setChartOptions] = useState(null);
    const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);

    useEffect(() => {
        if (!flattenedData?.length || !plannedEffortForProject) {
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
                    sprint: sprint,
                    tasks: []
                };
            }
            
            sprintData[sprint].tasks.push(task);
        });

        const sortedSprints = Array.from(sprints).sort();
        
        // Calculate total completed effort and average effort per sprint
        const totalCompletedEffort = sortedSprints.reduce((sum, sprint) => sum + sprintData[sprint].tasks.reduce((sum, task) => sum + Number(task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value]) || 0, 0), 0);
        const averageEffortPerSprint = totalCompletedEffort / sortedSprints.length;
        
        console.log('Sprint Data:', sprintData);
        console.log('Total Completed Effort:', totalCompletedEffort);
        console.log('Number of Sprints:', sortedSprints.length);
        console.log('Average Effort per Sprint:', averageEffortPerSprint);
        
        // Calculate remaining effort
        const remainingEffort = plannedEffortForProject - totalCompletedEffort;
        
        // Calculate number of sprints needed based on average effort per sprint
        const predictedSprints = Math.ceil(remainingEffort / averageEffortPerSprint);
        const futureSprints = Array.from({ length: predictedSprints }, (_, i) => 
            `Sprint ${sortedSprints.length + i + 1}`);

        // Generate insights
        const insights: Insight[] = [];
        
        // Add prediction insight
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + (predictedSprints * 10)); // Assuming 10 days per sprint
        
        insights.push({
            text: `Project Timeline: At the current rate of ${averageEffortPerSprint.toFixed(1)} days per sprint, the project will take ${predictedSprints} more sprints to complete. Estimated completion: ${completionDate.toLocaleDateString()}.`,
            severity: 0
        });

        // Create chart options
        const options = {
            title: {
                text: 'Effort Prediction',
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
                data: ['Actual Effort', 'Planned Effort', 'Average Effort per Sprint']
            },
            xAxis: {
                type: 'category',
                data: [...sortedSprints, ...futureSprints],
                axisLabel: {
                    formatter: (value, index) => {
                        return index >= sortedSprints.length ? `{future|${value}}` : value;
                    },
                    rich: {
                        future: {
                            color: '#00ff00', // Future sprints in green
                            fontWeight: 'bold'
                        }
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: 'Effort (days)'
            },
            series: [
                {
                    name: 'Actual Effort',
                    type: 'line',
                    data: sortedSprints.map(sprint => sprintData[sprint].tasks.reduce((sum, task) => sum + Number(task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value]) || 0, 0)),
                    markLine: {
                        data: [
                            {
                                name: 'Planned Effort',
                                yAxis: plannedEffortForProject,
                                lineStyle: {
                                    color: '#ff0000',
                                    type: 'solid'
                                },
                                label: {
                                    formatter: 'Planned Effort: {c} days'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'Average Effort per Sprint',
                    type: 'line',
                    data: [
                        ...Array(sortedSprints.length).fill(null),
                        ...Array(predictedSprints).fill(averageEffortPerSprint)
                    ],
                    lineStyle: {
                        type: 'dashed',
                        color: '#00ff00'
                    },
                    itemStyle: {
                        color: '#00ff00'
                    }
                }
            ]
        };

        setChartOptions(options);

        // Only update insights if they've changed
        if (onInsightsGenerated && JSON.stringify(insights) !== JSON.stringify(previousInsights)) {
            onInsightsGenerated(insights);
            setPreviousInsights(insights);
        }
    }, [flattenedData, projectKeys, onInsightsGenerated, previousInsights, plannedEffortForProject]);

    return (
        <div>
            {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
        </div>
    );
};