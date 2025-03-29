import barChartTemplate from "./templates/barChartTemplate.js";
import { PROJECT_KEYS } from '../../../config/projectKeys';

export const processBarChartData = (tasks, key, projectKeys) => {
  const chartOptions = JSON.parse(JSON.stringify(barChartTemplate));

  const result = {
    stackedBySize: {
      categories: [],
      series: [],
    },
  };

  const keyGroup = new Set();
  const sizeTypes = new Set();
  const keyToSizeCount = {};

  tasks.forEach((task) => {
    const value = task[key] || "No Value";
    keyGroup.add(value);
    keyToSizeCount[value] = keyToSizeCount[value] || {};
    const size = task[projectKeys[PROJECT_KEYS.SIZE].value] || "No Size";
    sizeTypes.add(size);
    keyToSizeCount[value][size] = (keyToSizeCount[value][size] || 0) + 1;
  });

  // Prepare chart data - handle both stacked and regular bar charts
  result.stackedBySize.categories = Array.from(keyGroup);
  result.stackedBySize.series = Array.from(sizeTypes).map((size) => {
    return {
      name: size,
      type: "bar",
      ...(sizeTypes.size > 1 ? { stack: "sizes" } : {}),
      data: Array.from(keyGroup).map(
        (value) => (keyToSizeCount[value] && keyToSizeCount[value][size]) || 0
      ),
      emphasis: {
        focus: sizeTypes.size > 1 ? "series" : "self",
      },
    };
  });

  chartOptions.xAxis.data = result?.stackedBySize?.categories || [];
  chartOptions.series = result?.stackedBySize?.series || [];
  if(chartOptions.series[0].data.length <=1) {
    return;
  }
  return chartOptions;
};

export const processTasksForECharts = (tasks, projectKeys) => {
  // Initialize result object to store all chart data
  const result = {
    totalNumberOfTasks: 0,

    ticketsByStatus: {
      categories: [],
      data: []
    },
    // For "Count of tickets by Assignee" chart
    ticketsByAssignee: {
      categories: [],
      data: []
    },
    
    // For stacked bar chart by labels
    stackedByLabels: {
      categories: [],
      series: []
    },
    
    // For stacked bar chart by size
    stackedBySize: {
      categories: [],
      series: []
    },

    // For "Total Estimated Effort" chart
    totalEstimatedEffort: 0,
      
    // For "Total Actual Effort" chart
    totalActualEffort: 0,
    
    // For "Estimated Effort by Assignee" chart
    estimatedEffortByAssignee: {
      categories: [],
      data: []
    },
    
    // For "Actual Effort by Assignee" chart
    actualEffortByAssignee: {
      categories: [],
      data: []
    }
  };
  
  const assigneeCount = {};
  const statusCount = {};
  const estimatedByAssignee = {};
  const actualByAssignee = {};
  
  // For label stacking
  const assignees = new Set();
  const labelTypes = new Set();
  const assigneeToLabelCount = {};
  
  // For size stacking
  const sizeTypes = new Set();
  const assigneeToSizeCount = {};
  
  tasks.forEach(task => {
    result.totalNumberOfTasks++;
    statusCount[task.Status] = (statusCount[task.Status] || 0) + 1;
    if(task.Status !== 'Done') {
      return; // Skip incomplete tasks
    }

    result.totalEstimatedEffort += task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value] || 0;
    result.totalActualEffort += task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value] || 0;
    const estimate = task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value] || 0;
    const actual = task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value] || 0;
    
    // Process assignees
    const taskAssignees = task.assignees && task.assignees.length > 0 
      ? task.assignees 
      : ['Unassigned'];
    
    taskAssignees.forEach(assignee => {
      assigneeCount[assignee] = (assigneeCount[assignee] || 0) + 1;
      estimatedByAssignee[assignee] = (estimatedByAssignee[assignee] || 0) + estimate;
      actualByAssignee[assignee] = (actualByAssignee[assignee] || 0) + actual;

      // Add to regular assignee count
      assigneeCount[assignee] = (assigneeCount[assignee] || 0) + 1;
      
      // Add to assignees set for stacked charts
      assignees.add(assignee);
      
      // Initialize nested objects if they don't exist
      if (!assigneeToLabelCount[assignee]) {
        assigneeToLabelCount[assignee] = {};
      }
      
      if (!assigneeToSizeCount[assignee]) {
        assigneeToSizeCount[assignee] = {};
      }
      
      // Process labels for stacked chart
      if (task.labels && task.labels.length > 0) {
        task.labels.forEach(label => {
          const labelName = label.name;
          labelTypes.add(labelName);
          assigneeToLabelCount[assignee][labelName] = (assigneeToLabelCount[assignee][labelName] || 0) + 1;
        });
      } else {
        // Handle tasks with no labels
        labelTypes.add('No Label');
        assigneeToLabelCount[assignee]['No Label'] = (assigneeToLabelCount[assignee]['No Label'] || 0) + 1;
      }
      
      // Process size for stacked chart
      const size = task[projectKeys[PROJECT_KEYS.SIZE].value] || 'No Size';
      sizeTypes.add(size);
      assigneeToSizeCount[assignee][size] = (assigneeToSizeCount[assignee][size] || 0) + 1;
    });
  });
  
  // Prepare basic ticket counts by status
  result.ticketsByStatus.categories = Object.keys(statusCount);
  result.ticketsByStatus.data = Object.values(statusCount);
  
  // Prepare basic ticket counts by assignee
  result.ticketsByAssignee.categories = Object.keys(assigneeCount);
  result.ticketsByAssignee.data = Object.values(assigneeCount);
  
  // Prepare stacked chart data for labels
  result.stackedByLabels.categories = Array.from(assignees);
  result.stackedByLabels.series = Array.from(labelTypes).map(label => {
    return {
      name: label,
      type: 'bar',
      ...(labelTypes.size > 1 ? { stack: 'labels' } : {}),
      data: Array.from(assignees).map(assignee => 
        (assigneeToLabelCount[assignee] && assigneeToLabelCount[assignee][label]) || 0
      ),
      emphasis: {
        focus: labelTypes.size > 1 ? 'series' : 'self',
      },
    };
  });
  
  // Prepare stacked chart data for sizes
  result.stackedBySize.categories = Array.from(assignees);
  result.stackedBySize.series = Array.from(sizeTypes).map(size => {
    return {
      name: size,
      type: 'bar',
      ...(sizeTypes.size > 1 ? { stack: 'sizes' } : {}),
      data: Array.from(assignees).map(assignee => 
        (assigneeToSizeCount[assignee] && assigneeToSizeCount[assignee][size]) || 0
      ),
      emphasis: {
        focus: sizeTypes.size > 1 ? 'series' : 'self',
      },
    };
  });
  
  return result;
};

