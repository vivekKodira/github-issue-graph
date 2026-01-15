import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { ChartDropdown } from './ChartDropdown';
import { ErrorBoundary } from "./ErrorBoundary";

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
  const [chartOptions, setChartOptions] = useState(pieChartTemplate);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);

  useEffect(() => {
    const pieData = createPieChartData(flattenedData, projectKeys);
    
    // Filter data based on search term
    const filteredData = searchTerm
      ? pieData.filter(({ assignee }) => 
          assignee.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : pieData;
    
    // Extract available assignees
    const assignees = filteredData.map(({ assignee }) => assignee);
    setAvailableAssignees(assignees);
    
    // Set first assignee as default if none selected
    if (assignees.length > 0 && selectedAssignees.length === 0) {
      setSelectedAssignees([assignees[0]]);
    }
  }, [flattenedData, projectKeys, searchTerm]);

  useEffect(() => {
    if (selectedAssignees.length === 0) return;
    
    const pieData = createPieChartData(flattenedData, projectKeys);
    const selectedData = pieData.find(({ assignee }) => assignee === selectedAssignees[0]);
    
    if (selectedData) {
      const newChartOptions = {
        ...pieChartTemplate,
        title: {
          ...pieChartTemplate.title,
          text: ''
        },
        series: [{
          ...pieChartTemplate.series[0],
          name: 'Size',
          data: selectedData.data
        }]
      };
      setChartOptions(newChartOptions);
    }
  }, [selectedAssignees, flattenedData, projectKeys]);

  const handleAssigneeChange = (values: string[]) => {
    setSelectedAssignees(values);
  };

  return (
    <Box>
      <h3 style={{ 
        color: '#ffffff', 
        marginBottom: '16px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Tasks by Size
      </h3>
      <ChartDropdown
        title="Select assignee"
        options={availableAssignees}
        selectedValues={selectedAssignees}
        onSelectionChange={handleAssigneeChange}
        multiple={false}
        placeholder="Select an assignee"
      />
      <Box w="100%" h="350px">
        <ErrorBoundary chartName="Assignee Pie">
          <ECharts option={chartOptions} style={styleOptions} />
        </ErrorBoundary>
      </Box>
    </Box>
  );
}; 