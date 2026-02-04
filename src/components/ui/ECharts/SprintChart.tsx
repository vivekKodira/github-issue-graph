import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { processBarChartData } from "./createGraphData";
import { sortSprintsNumerically, NO_SPRINT_LABEL, getCreationMonth } from '@/util/commonFunctions';
import { ErrorBoundary } from "./ErrorBoundary";

const EMPTY_SPRINT_LABELS = ['No Value', NO_SPRINT_LABEL];

type XAxisMode = 'sprint' | 'creationDate';

export const SprintChart = ({ flattenedData, styleOptions }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptions, setChartOptions] = useState(null);
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('sprint');

  useEffect(() => {
    if (!flattenedData?.length) return;

    if (xAxisMode === 'creationDate') {
      const monthToSizeCount: Record<string, Record<string, number>> = {};
      const sizeTypes = new Set<string>();
      flattenedData.forEach((task) => {
        const month = getCreationMonth(task);
        if (!month) return;
        if (!monthToSizeCount[month]) monthToSizeCount[month] = {};
        const size = task[projectKeys[PROJECT_KEYS.SIZE].value] || 'No Size';
        sizeTypes.add(size);
        monthToSizeCount[month][size] = (monthToSizeCount[month][size] || 0) + 1;
      });
      const sortedMonths = Object.keys(monthToSizeCount).sort();
      if (sortedMonths.length <= 1) return;
      const sizeList = Array.from(sizeTypes);
      const options = {
        title: { text: 'Tasks by Creation Date', textStyle: { color: '#ffffff' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { textStyle: { color: '#ffffff' } },
        xAxis: { type: 'category', data: sortedMonths, axisLabel: { interval: 0, rotate: 45 } },
        yAxis: { type: 'value' },
        grid: { left: '10%', right: '10%', top: '20%', bottom: '18%', containLabel: true },
        dataZoom: [
          { type: 'slider', show: true, xAxisIndex: 0, start: 0, end: 100, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
          { type: 'inside', xAxisIndex: 0, start: 0, end: 100 }
        ],
        series: sizeList.map((size) => ({
          name: size,
          type: 'bar',
          ...(sizeList.length > 1 ? { stack: 'sizes' } : {}),
          data: sortedMonths.map((m) => monthToSizeCount[m][size] || 0),
          emphasis: { focus: sizeList.length > 1 ? 'series' : 'self' },
        })),
      };
      setChartOptions(options);
      return;
    }

    const sortedTasks = [...flattenedData].sort((a, b) => {
      const sprintA = a[projectKeys[PROJECT_KEYS.SPRINT].value] || NO_SPRINT_LABEL;
      const sprintB = b[projectKeys[PROJECT_KEYS.SPRINT].value] || NO_SPRINT_LABEL;

      const sortedSprints = sortSprintsNumerically([sprintA, sprintB]);
      return sortedSprints[0] === sprintA ? -1 : 1;
    });

    const options = processBarChartData(sortedTasks, projectKeys[PROJECT_KEYS.SPRINT].value, projectKeys);
    if (!options) return;

    const categories = options.xAxis?.data || [];
    const emptyLabel = categories.find(c => EMPTY_SPRINT_LABELS.includes(c));
    const sprintCategories = categories.filter(c => !EMPTY_SPRINT_LABELS.includes(c));
    sortSprintsNumerically(sprintCategories);
    if (emptyLabel) sprintCategories.push(emptyLabel);

    const oldOrder = categories;
    const newOrder = sprintCategories;
    const indexMap = newOrder.map(cat => oldOrder.indexOf(cat));

    options.xAxis.data = newOrder;
    options.series.forEach((s: { data: number[] }) => {
      s.data = indexMap.map(i => s.data[i]);
    });

    options.grid = { left: '10%', right: '10%', top: '20%', bottom: '18%', containLabel: true };
    options.dataZoom = [
      { type: 'slider', show: true, xAxisIndex: 0, start: 0, end: 100, bottom: '5%', height: 20, borderColor: '#ccc', textStyle: { color: '#ffffff' }, handleStyle: { color: '#999' } },
      { type: 'inside', xAxisIndex: 0, start: 0, end: 100 }
    ];

    setChartOptions(options);
  }, [flattenedData, projectKeys, xAxisMode]);

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
        <ErrorBoundary chartName="Sprint">
          <ECharts option={chartOptions} style={styleOptions} />
        </ErrorBoundary>
      )}
    </Box>
  );
};