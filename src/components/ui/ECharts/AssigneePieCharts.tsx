import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect } from "react";
import { Box, Wrap, WrapItem } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js"; // You'll need to create this template
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';

export const createPieChartData = (tasks, projectKeys) => {
  const assigneeData = {};

  tasks.forEach((task) => {
    if (task.Status !== "Done") {
      return; // Skip incomplete tasks
    }

    // Skip tasks with no assignees
    if (!task.assignees || task.assignees.length === 0) {
      return;
    }

    // Process assignees
    task.assignees.forEach((assignee) => {
      if (!assigneeData[assignee]) {
        assigneeData[assignee] = {};
      }
      
      const size = task[projectKeys[PROJECT_KEYS.SIZE].value] || "No Size";
      assigneeData[assignee][size] = (assigneeData[assignee][size] || 0) + 1;
    });
  });

  // Convert to series data format for each assignee
  return Object.entries(assigneeData).map(([assignee, sizeData]) => ({
    assignee,
    data: Object.entries(sizeData).map(([size, count]) => ({
      name: size,
      value: count
    }))
  }));
};

export const AssigneePieCharts = ({ flattenedData, styleOptions, searchTerm }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptionsArray, setChartOptionsArray] = useState([]);

  useEffect(() => {
    const pieData = createPieChartData(flattenedData, projectKeys);
    
    // Filter data based on search term
    const filteredData = searchTerm
      ? pieData.filter(({ assignee }) => 
          assignee.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : pieData;
    
    const newChartOptions = filteredData.map(({ assignee, data }) => ({
      ...pieChartTemplate,
      title: {
        ...pieChartTemplate.title,
        text: `Tasks by Size - ${assignee}`
      },
      series: [{
        ...pieChartTemplate.series[0],
        name: 'Size',
        data: data
      }]
    }));

    setChartOptionsArray(newChartOptions);
  }, [flattenedData, projectKeys, searchTerm]);

  return (
    <Wrap gap={4} justify="center" align="start">
      {chartOptionsArray.map((options, index) => (
        <WrapItem key={index} flexBasis={{ base: "100%", md: "calc(50% - 16px)", lg: "calc(33.333% - 16px)" }}>
          <Box w="100%" h="350px">
            <ECharts option={options} style={styleOptions} />
          </Box>
        </WrapItem>
      ))}
    </Wrap>
  );
}; 