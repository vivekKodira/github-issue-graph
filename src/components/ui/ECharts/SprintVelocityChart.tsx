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

export const SprintVelocityChart = ({ flattenedData, styleOptions, onInsightsGenerated }) => {
    const { projectKeys } = useProjectKeys();
    const [chartOptions, setChartOptions] = useState(null);
    const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);
    const [xAxisMode, setXAxisMode] = useState<XAxisMode>('sprint');

    useEffect(() => {
        if (!flattenedData?.length) {
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
            const options = {
                title: {
                    text: 'Sprint Velocity Trends (by Creation Date)',
                    textStyle: { color: '#ffffff' }
                },
                grid: { left: '10%', right: '10%', top: '15%', bottom: '18%', containLabel: true },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { textStyle: { color: '#ffffff' }, data: ['Completed Tasks', 'Effort (days)'] },
                xAxis: { type: 'category', data: sortedMonths },
                yAxis: [
                    { type: 'value', name: 'Count', position: 'left' },
                    { type: 'value', name: 'Effort', position: 'right' }
                ],
                dataZoom: [
                    { type: 'slider', show: true, xAxisIndex: 0, start: 0, end: 100, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
                    { type: 'inside', xAxisIndex: 0, start: 0, end: 100 }
                ],
                series: [
                    {
                        name: 'Completed Tasks',
                        type: 'bar',
                        data: sortedMonths.map(m => monthData[m].length)
                    },
                    {
                        name: 'Effort (days)',
                        type: 'line',
                        yAxisIndex: 1,
                        data: sortedMonths.map(m => monthData[m].reduce((t, task) => t + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0))
                    }
                ]
            };
            setChartOptions(options);
            if (onInsightsGenerated) onInsightsGenerated([]);
            return;
        }

        const sprintData: Record<string, SprintData> = {};
        const sprints = new Set<string>();

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

        const insights: Insight[] = [];
        if (namedSprints.length >= 2) {
            const currentSprint = namedSprints[namedSprints.length - 1];
            const previousSprint = namedSprints[namedSprints.length - 2];

            const currentTasks = sprintData[currentSprint].tasks.length;
            const previousTasks = sprintData[previousSprint].tasks.length;
            if (currentTasks < previousTasks) {
                const decrease = ((previousTasks - currentTasks) / previousTasks * 100).toFixed(1);
                const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20)));
                insights.push({
                    text: `Sprint velocity decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentTasks} vs ${previousTasks} tasks)`,
                    severity
                });
            }

            const currentEffort = sprintData[currentSprint].tasks.reduce((total, task) => total + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0);
            const previousEffort = sprintData[previousSprint].tasks.reduce((total, task) => total + Number(task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value]) || 0, 0);
            if (currentEffort < previousEffort) {
                const decrease = ((previousEffort - currentEffort) / previousEffort * 100).toFixed(1);
                const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20)));
                insights.push({
                    text: `Sprint effort decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint} (${currentEffort.toFixed(1)} vs ${previousEffort.toFixed(1)} days)`,
                    severity
                });
            }
        }

        if (onInsightsGenerated && JSON.stringify(insights) !== JSON.stringify(previousInsights)) {
            onInsightsGenerated(insights);
            setPreviousInsights(insights);
        }

        const options = {
            title: {
                text: 'Sprint Velocity Trends',
                textStyle: { color: '#ffffff' }
            },
            grid: { left: '10%', right: '10%', top: '15%', bottom: '18%', containLabel: true },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { textStyle: { color: '#ffffff' }, data: ['Completed Tasks', 'Effort (days)'] },
            xAxis: { type: 'category', data: sortedSprints },
            yAxis: [
                { type: 'value', name: 'Count', position: 'left' },
                { type: 'value', name: 'Effort', position: 'right' }
            ],
            dataZoom: [
                { type: 'slider', show: true, xAxisIndex: 0, start: 0, end: 100, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
                { type: 'inside', xAxisIndex: 0, start: 0, end: 100 }
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
    }, [flattenedData, projectKeys, onInsightsGenerated, previousInsights, xAxisMode]);

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
                <ErrorBoundary chartName="Sprint Velocity">
                    <ECharts option={chartOptions} style={styleOptions} />
                </ErrorBoundary>
            )}
        </Box>
    );
}; 
