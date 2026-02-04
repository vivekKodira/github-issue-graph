import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { processBarChartData } from "./createGraphData";
import { sortSprintsNumerically, NO_SPRINT_LABEL } from '@/util/commonFunctions';
import { ErrorBoundary } from "./ErrorBoundary";

const EMPTY_SPRINT_LABELS = ['No Value', NO_SPRINT_LABEL];

export const SprintChart = ({ flattenedData, styleOptions }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptions, setChartOptions] = useState(null);

  useEffect(() => {
    if (!flattenedData?.length) return;

    // Sort tasks by sprint using the sortSprintsNumerically function
    const sortedTasks = [...flattenedData].sort((a, b) => {
      const sprintA = a[projectKeys[PROJECT_KEYS.SPRINT].value] || NO_SPRINT_LABEL;
      const sprintB = b[projectKeys[PROJECT_KEYS.SPRINT].value] || NO_SPRINT_LABEL;

      const sortedSprints = sortSprintsNumerically([sprintA, sprintB]);
      return sortedSprints[0] === sprintA ? -1 : 1;
    });

    const options = processBarChartData(sortedTasks, projectKeys[PROJECT_KEYS.SPRINT].value, projectKeys);
    if (!options) return;

    // Put "No Value" / "No Sprint" category last; keep series data in sync with category order
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

    setChartOptions(options);
  }, [flattenedData, projectKeys]);

  return (
    <div>
      {chartOptions && (
        <ErrorBoundary chartName="Sprint">
          <ECharts option={chartOptions} style={styleOptions} />
        </ErrorBoundary>
      )}
    </div>
  );
};