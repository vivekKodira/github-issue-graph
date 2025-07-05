import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { processBarChartData } from "./createGraphData";
import { sortSprintsNumerically } from '@/util/commonFunctions';

export const SprintChart = ({ flattenedData, styleOptions }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptions, setChartOptions] = useState(null);

  useEffect(() => {
    if (!flattenedData?.length) return;

    // Sort tasks by sprint using the sortSprintsNumerically function
    const sortedTasks = [...flattenedData].sort((a, b) => {
      const sprintA = a[projectKeys[PROJECT_KEYS.SPRINT].value] || 'No Sprint';
      const sprintB = b[projectKeys[PROJECT_KEYS.SPRINT].value] || 'No Sprint';
      
      // Use sortSprintsNumerically for proper numeric sorting of sprint names
      const sortedSprints = sortSprintsNumerically([sprintA, sprintB]);
      return sortedSprints[0] === sprintA ? -1 : 1;
    });

    const options = processBarChartData(sortedTasks, projectKeys[PROJECT_KEYS.SPRINT].value, projectKeys);
    if (options) {
      setChartOptions(options);
    }
  }, [flattenedData, projectKeys]);

  return (
    <div>
      {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
    </div>
  );
};