import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { TaskFormat } from '@/util/taskConverter';
import { sortSprintsNumerically } from '@/util/commonFunctions';
import { Insight } from './types';
import { ErrorBoundary } from "./ErrorBoundary";

interface SprintData {
    sprint: string;
    tasks: TaskFormat[];
}


export const EffortPredictionChart = ({ 
    flattenedData, 
    styleOptions, 
    onInsightsGenerated, 
    plannedEffortForProject,
    plannedEndDate
}) => {
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

        const sortedSprints = sortSprintsNumerically(Array.from(sprints));
        
        // Calculate total completed effort and average effort per sprint
        const totalCompletedEffort = sortedSprints.reduce((sum, sprint) => 
            sum + sprintData[sprint].tasks.reduce((sum, task) => 
                sum + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0), 0);
        const averageEffortPerSprint = sortedSprints.length > 0 ? totalCompletedEffort / sortedSprints.length : 0;
        
        // Calculate remaining effort
        const remainingEffort = plannedEffortForProject - totalCompletedEffort;
        
        // Calculate number of sprints needed based on average effort per sprint
        // Handle edge cases where averageEffortPerSprint is 0 or NaN
        const predictedSprints = averageEffortPerSprint > 0 ? Math.ceil(remainingEffort / averageEffortPerSprint) : 0;
        const futureSprints = predictedSprints > 0 ? Array.from({ length: predictedSprints }, (_, i) => 
            `Sprint ${sortedSprints.length + i + 1}`) : [];

        // Generate insights
        const insights: Insight[] = [];
        
        // Calculate completion date
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + (predictedSprints * 10)); // Assuming 10 days per sprint
        
        // Format dates for display
        const formattedCompletionDate = completionDate.toLocaleDateString();
        const formattedPlannedDate = plannedEndDate ? new Date(plannedEndDate).toLocaleDateString() : 'not set';

        // Base insight about timeline
        let timelineInsight = '';
        let severity = 0;
        
        if (averageEffortPerSprint > 0) {
            timelineInsight = `Project Timeline: At the current rate of ${averageEffortPerSprint.toFixed(1)} days per sprint, the project will take ${predictedSprints} more sprints to complete. Estimated completion: ${formattedCompletionDate}.`;
        } else {
            timelineInsight = `Project Timeline: No completed effort data available. Unable to predict completion timeline.`;
        }

        // Add planned date comparison if available
        if (plannedEndDate && averageEffortPerSprint > 0) {
            const plannedDate = new Date(plannedEndDate);
            const daysDifference = Math.ceil(
                (completionDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            
            if (daysDifference > 0) {
                timelineInsight += ` This is ${daysDifference} days after the planned completion date (${formattedPlannedDate}).`;
                // Calculate severity based on days late (negative for being behind)
                if (daysDifference <= 5) severity = -1;
                else if (daysDifference <= 10) severity = -2;
                else if (daysDifference <= 15) severity = -3;
                else if (daysDifference <= 20) severity = -4;
                else severity = -5;
            } else if (daysDifference < 0) {
                timelineInsight += ` This is ${Math.abs(daysDifference)} days before the planned completion date (${formattedPlannedDate}).`;
                severity = 1; // Positive for being ahead of schedule
            } else {
                timelineInsight += ` This matches the planned completion date (${formattedPlannedDate}).`;
                severity = 0; // Neutral for being exactly on schedule
            }
        }

        insights.push({
            text: timelineInsight,
            severity: severity
        });

        // Add velocity insight if behind schedule
        if (plannedEndDate && severity < 0) { // Changed to check for negative severity
            const plannedDate = new Date(plannedEndDate);
            const remainingDays = Math.ceil((plannedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const remainingSprints = Math.ceil(remainingDays / 10); // Assuming 10 days per sprint
            const requiredVelocityIncrease = ((plannedEffortForProject - totalCompletedEffort) / remainingSprints) - averageEffortPerSprint;

            if (requiredVelocityIncrease > 0) {
                insights.push({
                    text: `To meet the planned completion date, the team needs to increase their velocity by ${requiredVelocityIncrease.toFixed(1)} days of effort per sprint.`,
                    severity: Math.max(severity - 1, -5) // Make it more negative for worse situation
                });
            }
        }

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
                            color: '#00ff00',
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
                    data: sortedSprints.map(sprint => 
                        sprintData[sprint].tasks.reduce((sum, task) => 
                            sum + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0)
                    ),
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
                            },
                            ...(plannedEndDate ? [{
                                name: 'Planned End Date',
                                xAxis: new Date(plannedEndDate).toLocaleDateString(),
                                lineStyle: {
                                    color: '#ff0000',
                                    type: 'dashed'
                                },
                                label: {
                                    formatter: 'Planned End Date'
                                }
                            }] : [])
                        ]
                    }
                },
                {
                    name: 'Average Effort per Sprint',
                    type: 'line',
                    data: [
                        ...Array(sortedSprints.length).fill(null),
                        ...(predictedSprints > 0 ? Array(predictedSprints).fill(averageEffortPerSprint) : [])
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
    }, [flattenedData, projectKeys, onInsightsGenerated, previousInsights, plannedEffortForProject, plannedEndDate]);

    return (
        <div>
            {chartOptions && (
                <ErrorBoundary chartName="Effort Prediction">
                    <ECharts option={chartOptions} style={styleOptions} />
                </ErrorBoundary>
            )}
        </div>
    );
};
