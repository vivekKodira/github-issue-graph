import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { TaskFormat } from '@/util/taskConverter';
import { sortSprintsNumerically, NO_SPRINT_LABEL, getCreationMonth } from '@/util/commonFunctions';
import { Insight } from './types';
import { ErrorBoundary } from "./ErrorBoundary";

type XAxisMode = 'sprint' | 'creationDate';

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
    const [xAxisMode, setXAxisMode] = useState<XAxisMode>('sprint');

    useEffect(() => {
        if (!flattenedData?.length || !plannedEffortForProject) {
            setChartOptions(null);
            if (onInsightsGenerated) {
                onInsightsGenerated([]);
            }
            return;
        }

        if (xAxisMode === 'creationDate') {
            const monthData: Record<string, TaskFormat[]> = {};
            flattenedData.forEach(task => {
                if (task.Status !== "Done") return;
                const month = getCreationMonth(task);
                if (!month) return;
                if (!monthData[month]) monthData[month] = [];
                monthData[month].push(task);
            });
            const sortedMonths = Object.keys(monthData).sort();
            const effortByMonth = sortedMonths.map(m =>
                monthData[m].reduce((sum, task) => sum + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0)
            );
            const options = {
                title: { text: 'Effort Prediction (by Creation Date)', textStyle: { color: '#ffffff' } },
                grid: { left: '10%', right: '10%', top: '15%', bottom: '18%', containLabel: true },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { textStyle: { color: '#ffffff' }, data: ['Actual Effort', 'Planned Effort'] },
                xAxis: { type: 'category', data: sortedMonths },
                yAxis: { type: 'value', name: 'Effort (days)' },
                dataZoom: [
                    { type: 'slider', show: true, xAxisIndex: 0, start: 0, end: 100, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
                    { type: 'inside', xAxisIndex: 0, start: 0, end: 100 }
                ],
                series: [
                    {
                        name: 'Actual Effort',
                        type: 'line',
                        data: effortByMonth,
                        markLine: {
                            data: [
                                {
                                    name: 'Planned Effort',
                                    yAxis: plannedEffortForProject,
                                    lineStyle: { color: '#ff0000', type: 'solid' },
                                    label: { formatter: 'Planned Effort: {c} days' }
                                },
                                ...(plannedEndDate ? [{
                                    name: 'Planned End Date',
                                    xAxis: new Date(plannedEndDate).toLocaleDateString(),
                                    lineStyle: { color: '#ff0000', type: 'dashed' },
                                    label: { formatter: 'Planned End Date' }
                                }] : [])
                            ]
                        }
                    }
                ]
            };
            setChartOptions(options);
            if (onInsightsGenerated) onInsightsGenerated([]);
            return;
        }

        const sprintData: Record<string, SprintData> = {};
        const sprints = new Set<string>();

        // Process tasks by sprint (include no-sprint as NO_SPRINT_LABEL; include in total for visibility)
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

        // Total completed effort includes No Sprint so those tasks are visible in the chart
        const totalCompletedEffort = sortedSprints.reduce((sum, sprint) =>
            sum + sprintData[sprint].tasks.reduce((sum, task) =>
                sum + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0), 0);
        // Average and prediction use only named sprints so velocity is meaningful
        const totalCompletedEffortNamed = namedSprints.reduce((sum, sprint) =>
            sum + sprintData[sprint].tasks.reduce((sum, task) =>
                sum + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0), 0);
        const averageEffortPerSprint = namedSprints.length > 0 ? totalCompletedEffortNamed / namedSprints.length : 0;

        // Calculate remaining effort
        const remainingEffort = plannedEffortForProject - totalCompletedEffort;

        // Calculate number of sprints needed based on average effort per named sprint
        const predictedSprints = averageEffortPerSprint > 0 ? Math.ceil(remainingEffort / averageEffortPerSprint) : 0;
        const futureSprints = predictedSprints > 0 ? Array.from({ length: predictedSprints }, (_, i) =>
            `Sprint ${namedSprints.length + i + 1}`) : [];

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
            grid: { left: '10%', right: '10%', top: '15%', bottom: '18%', containLabel: true },
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
            dataZoom: [
                { type: 'slider', show: true, xAxisIndex: 0, start: 0, end: 100, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
                { type: 'inside', xAxisIndex: 0, start: 0, end: 100 }
            ],
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
    }, [flattenedData, projectKeys, onInsightsGenerated, previousInsights, plannedEffortForProject, plannedEndDate, xAxisMode]);

    return (
        <Box>
            <Box mb={2} display="flex" alignItems="center" gap={2}>
                <label style={{ color: '#ffffff', fontSize: '14px' }}>X-axis:</label>
                <select
                    value={xAxisMode}
                    onChange={(e) => setXAxisMode(e.target.value as XAxisMode)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: '#2d3748',
                        color: '#ffffff',
                        border: '1px solid #4a5568'
                    }}
                >
                    <option value="sprint">Sprint</option>
                    <option value="creationDate">Creation date</option>
                </select>
            </Box>
            {chartOptions && (
                <ErrorBoundary chartName="Effort Prediction">
                    <ECharts option={chartOptions} style={styleOptions} />
                </ErrorBoundary>
            )}
        </Box>
    );
};
