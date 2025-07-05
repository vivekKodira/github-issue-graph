import { ECharts } from "@/components/ui/ECharts/ECharts.js";
import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import pieChartTemplate from "./templates/pieChartTemplate.js";
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
  const [chartOptions, setChartOptions] = useState(pieChartTemplate);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [availableAssignees, setAvailableAssignees] = useState([]);

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
    if (assignees.length > 0 && !selectedAssignee) {
      setSelectedAssignee(assignees[0]);
    }
  }, [flattenedData, projectKeys, searchTerm, selectedAssignee]);

  useEffect(() => {
    if (!selectedAssignee) return;
    
    const pieData = createPieChartData(flattenedData, projectKeys);
    const selectedData = pieData.find(({ assignee }) => assignee === selectedAssignee);
    
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
  }, [selectedAssignee, flattenedData, projectKeys]);

  const handleAssigneeChange = (event) => {
    setSelectedAssignee(event.target.value);
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
      <select
        value={selectedAssignee}
        onChange={handleAssigneeChange}
        style={{
          padding: '8px',
          borderRadius: '4px',
          width: '100%',
          background: '#2d3748',
          color: '#ffffff',
          border: '1px solid #4a5568',
          marginBottom: '16px'
        }}
      >
        {availableAssignees.map((assignee) => (
          <option key={assignee} value={assignee}>
            {assignee}
          </option>
        ))}
      </select>
      <Box w="100%" h="350px">
        <ECharts option={chartOptions} style={styleOptions} />
      </Box>
    </Box>
  );
}; 