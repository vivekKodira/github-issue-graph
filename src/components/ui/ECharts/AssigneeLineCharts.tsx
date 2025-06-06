import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { PROJECT_KEYS } from '@/config/projectKeys';
import { useProjectKeys } from '@/context/ProjectKeysContext';
import { Box, Table, Stack } from "@chakra-ui/react";
import { LuChevronDown, LuX } from "react-icons/lu";
import { TaskFormat } from '@/util/taskConverter';
import { Insight } from './types';

interface AssigneeData {
  assignee: string;
  tasks: TaskFormat[];
}

export const createLineChartData = (tasks, projectKeys) => {
  const sprintData = {};
  const assigneeData = {};

  // Initialize data structures
  tasks.forEach((task) => {
    if (task.Status !== "Done") {
      return; // Skip incomplete tasks
    }

    const sprint = task[projectKeys[PROJECT_KEYS.SPRINT].value];
    if (!sprint) {
      return; // Skip tasks with no sprint
    }

    // Get task weight based on actual days or estimate days
    const actualDays = task[projectKeys[PROJECT_KEYS.ACTUAL_DAYS].value];
    const estimateDays = task[projectKeys[PROJECT_KEYS.ESTIMATE_DAYS].value];
    const weight = actualDays || estimateDays || 1; // Default to 1 if neither is available

    // Process assignees
    const taskAssignees = task.assignees && task.assignees.length > 0
      ? task.assignees
      : null;  // Skip unassigned tasks

    if (!taskAssignees) return;  // Skip if no assignees

    taskAssignees.forEach((assignee) => {
      if (!sprintData[sprint]) {
        sprintData[sprint] = {};
      }
      if (!sprintData[sprint][assignee]) {
        sprintData[sprint][assignee] = 0;
      }
      sprintData[sprint][assignee] += weight;
      assigneeData[assignee] = true;
    });
  });

  // Sort sprints
  const sprints = Object.keys(sprintData).sort();
  const assignees = Object.keys(assigneeData);

  // Create series data for all assignees
  const allAssigneesSeries = {
    name: "All Assignees",
    type: "line",
    data: sprints.map((sprint) => {
      return Object.values(sprintData[sprint]).reduce((sum: number, val: number) => sum + val, 0);
    }),
  };

  // Create series data for each assignee
  const assigneeSeries = assignees.map((assignee) => ({
    name: assignee,
    type: "line",
    data: sprints.map((sprint) => sprintData[sprint][assignee] || 0),
  }));

  return {
    sprints,
    allAssigneesSeries,
    assigneeSeries,
  };
};

export const AssigneeLineCharts = ({ flattenedData, styleOptions, searchTerm, onInsightsGenerated }) => {
  const { projectKeys } = useProjectKeys();
  const [chartOptionsArray, setChartOptionsArray] = useState([]);
  const [previousInsights, setPreviousInsights] = useState<Insight[]>([]);
  const [tableData, setTableData] = useState<AssigneeData[]>([]);
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const [selectedSprints, setSelectedSprints] = useState<Record<string, string>>({});
  const [isTableVisible, setIsTableVisible] = useState<Record<string, boolean>>({});
  const pageSize = 10;

  useEffect(() => {
    if (!flattenedData?.length) {
      setChartOptionsArray([]);
      setTableData([]);
      if (onInsightsGenerated) {
        onInsightsGenerated([]);
      }
      return;
    }


    const { sprints, assigneeSeries } = createLineChartData(flattenedData, projectKeys);
    
    // Generate insights from chart data
    const insights: Insight[] = [];
    assigneeSeries.forEach(series => {
      const data = series.data;
      if (data.length >= 2) {
        const currentValue = data[data.length - 1];
        const previousValue = data[data.length - 2];
        const currentSprint = sprints[sprints.length - 1];
        const previousSprint = sprints[sprints.length - 2];

        if (currentValue < previousValue) {
          const decrease = ((previousValue - currentValue) / previousValue * 100).toFixed(1);
          const severity = -Math.min(5, Math.max(1, Math.floor(Number(decrease) / 20)));
          insights.push({
            text: `${series.name}'s task efforts decreased by ${decrease}% in ${currentSprint} compared to ${previousSprint}`,
            severity
          });
        }
        
        else if (currentValue > previousValue) {
          const increase = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
          const severity = Math.min(5, Math.max(1, Math.floor(Number(increase) / 20)));
          insights.push({
            text: `${series.name}'s task efforts increased by ${increase}% in ${currentSprint} compared to ${previousSprint}`,
            severity
          });
        }
      }
    });

    // Only update insights if they've changed
    if (onInsightsGenerated && JSON.stringify(insights) !== JSON.stringify(previousInsights)) {
      onInsightsGenerated(insights);
      setPreviousInsights(insights);
    }

    // Filter assignee series based on search term
    const filteredAssigneeSeries = searchTerm
      ? assigneeSeries.filter(series => 
          series.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : assigneeSeries;

    // Create table data for each assignee
    const assigneeTableData = filteredAssigneeSeries.map(series => {
      const tasks = flattenedData
        .filter(task => {
          const taskAssignees = task.assignees && task.assignees.length > 0
            ? task.assignees
            : null;
          return taskAssignees && 
                 taskAssignees.includes(series.name) && 
                 task.Status === "Done"; // Only include Done tasks
        })
        .map(task => {
          const mappedTask = {
            ...task,
            [PROJECT_KEYS.ACTUAL_DAYS]: task[PROJECT_KEYS.ACTUAL_DAYS] || 0
          };
          return mappedTask;
        });

      return {
        assignee: series.name,
        tasks
      };
    });


    setTableData(assigneeTableData);

    // Create options for individual assignee charts
    const individualCharts = filteredAssigneeSeries.map((series) => ({
      title: {
        text: `Tasks Value per Sprint - ${series.name}`,
        left: "center",
        textStyle: {
          color: '#ffffff'
        }
      },
      tooltip: {
        trigger: "axis",
      },
      xAxis: {
        type: "category",
        data: sprints,
      },
      yAxis: {
        type: "value",
        name: "Task Value",
      },
      series: [series],
    }));

    setChartOptionsArray(individualCharts);
  }, [flattenedData, projectKeys, searchTerm, onInsightsGenerated, previousInsights]);

  const handlePageChange = (assignee: string, page: number) => {
    setCurrentPages(prev => ({ ...prev, [assignee]: page }));
  };

  const handleSprintChange = (assignee: string, sprint: string) => {
    setSelectedSprints(prev => ({ ...prev, [assignee]: sprint }));
  };

  const toggleTableVisibility = (assignee: string) => {
    setIsTableVisible(prev => ({
      ...prev,
      [assignee]: !prev[assignee]
    }));
  };

  return (
    <Stack gap={4}>
      {/* Consolidated Chart */}
      <Box>
        {(() => {
          const { sprints, assigneeSeries } = createLineChartData(flattenedData, projectKeys);
          const series: echarts.SeriesOption[] = assigneeSeries.map(series => ({
            name: series.name,
            type: 'line' as const,
            data: series.data
          }));
          
          return (
            <ECharts option={{
              title: {
                text: "Tasks Value per Sprint - All Assignees",
                left: "center",
                top: 20,
                textStyle: {
                  color: '#ffffff'
                }
              },
              tooltip: {
                trigger: "axis",
              },
              legend: {
                data: assigneeSeries.map(series => series.name),
                textStyle: {
                  color: '#ffffff'
                },
                top: 60,
                type: 'scroll',
                orient: 'horizontal',
                padding: [0, 20]
              },
              grid: {
                top: 100,
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
              },
              xAxis: {
                type: "category",
                data: sprints,
                axisLabel: {
                  color: '#ffffff'
                }
              },
              yAxis: {
                type: "value",
                name: "Task Value",
                axisLabel: {
                  color: '#ffffff'
                }
              },
              series: series,
            }} style={styleOptions} />
          );
        })()}
      </Box>

      {/* Individual Charts with Tables */}
      {chartOptionsArray.map((options, index) => {
        const assigneeData = tableData[index];
        const currentPage = currentPages[assigneeData.assignee] || 1;
        const selectedSprint = selectedSprints[assigneeData.assignee] || 'all';
        const isVisible = isTableVisible[assigneeData.assignee] || false;
        
        // Filter tasks by selected sprint
        const filteredTasks = selectedSprint === 'all' 
          ? assigneeData.tasks 
          : assigneeData.tasks.filter(task => task[PROJECT_KEYS.SPRINT] === selectedSprint);

        // Get unique sprints for the filter dropdown
        const uniqueSprints = [...new Set(assigneeData.tasks.map(task => task[PROJECT_KEYS.SPRINT]))].sort();

        // Calculate pagination
        const totalPages = Math.ceil(filteredTasks.length / pageSize);
        const paginatedTasks = filteredTasks.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize
        );

        return (
          <Box key={index} position="relative" style={{ overflow: 'hidden' }}>
            {/* Backdrop when drawer is open */}
            {isVisible && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.2)',
                  zIndex: 1,
                  opacity: isVisible ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out'
                }}
                onClick={() => toggleTableVisibility(assigneeData.assignee)}
              />
            )}
            
            <Box position="relative">
              {/* Toggle button positioned in chart */}
              <button
                onClick={() => toggleTableVisibility(assigneeData.assignee)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  background: 'rgba(26, 32, 44, 0.8)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 1,
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26, 32, 44, 0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(26, 32, 44, 0.8)'}
              >
                {isVisible ? 'Hide Tasks' : 'View Tasks'}
                <div style={{
                  transform: isVisible ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease-in-out',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'transparent',
                }}>
                  <LuChevronDown
                    color="white"
                    size={20}
                    style={{
                      background: 'transparent',
                      borderRadius: 0,
                      boxShadow: 'none',
                      padding: 0,
                      display: 'block',
                    }}
                  />
                </div>
              </button>
              
              <ECharts option={options} style={{
                ...styleOptions,
                transition: 'all 0.3s ease-in-out',
                transform: isVisible ? 'scale(0.95)' : 'scale(1)'
              }} />
            </Box>

            {/* Drawer */}
            <Box
              style={{
                position: 'fixed',
                right: 0,
                top: 0,
                width: '50%',
                height: '100%',
                background: '#1a202c',
                transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: '16px',
                boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
                zIndex: 2,
                color: '#ffffff'
              }}
            >
              {/* Drawer header with close button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid #4a5568'
              }}>
                <h3 style={{ margin: 0 }}>{assigneeData.assignee}'s Tasks</h3>
                <button
                  onClick={() => toggleTableVisibility(assigneeData.assignee)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LuX
                    size={20}
                    style={{
                      background: 'transparent',
                      borderRadius: 0,
                      boxShadow: 'none',
                      padding: 0,
                      display: 'block',
                    }}
                  />
                </button>
              </div>

              <div style={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
                <select
                  value={selectedSprint}
                  onChange={(e) => handleSprintChange(assigneeData.assignee, e.target.value)}
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
                  <option value="all">All Sprints</option>
                  {uniqueSprints.map(sprint => (
                    <option key={sprint} value={sprint}>{sprint}</option>
                  ))}
                </select>
                <Table.Root size="sm" variant="outline">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader style={{ color: '#ffffff', borderBottom: '1px solid #4a5568' }}>Task Title</Table.ColumnHeader>
                      <Table.ColumnHeader style={{ color: '#ffffff', borderBottom: '1px solid #4a5568' }}>Sprint</Table.ColumnHeader>
                      <Table.ColumnHeader style={{ color: '#ffffff', borderBottom: '1px solid #4a5568' }}>Effort (days)</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedTasks.map((task, taskIndex) => (
                      <Table.Row key={taskIndex}>
                        <Table.Cell style={{ color: '#ffffff', borderBottom: '1px solid #4a5568' }}>
                          <a
                            href={task.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#63b3ed',
                              textDecoration: 'none'
                            }}
                          >
                            {task.title}
                          </a>
                        </Table.Cell>
                        <Table.Cell style={{ color: '#ffffff', borderBottom: '1px solid #4a5568' }}>{task[PROJECT_KEYS.SPRINT]}</Table.Cell>
                        <Table.Cell style={{ color: '#ffffff', borderBottom: '1px solid #4a5568' }}>{task[PROJECT_KEYS.ACTUAL_DAYS]}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', color: '#ffffff' }}>
                  <button
                    onClick={() => handlePageChange(assigneeData.assignee, currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '4px 8px',
                      background: '#2d3748',
                      color: '#ffffff',
                      border: '1px solid #4a5568',
                      borderRadius: '4px'
                    }}
                  >
                    Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => handlePageChange(assigneeData.assignee, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '4px 8px',
                      background: '#2d3748',
                      color: '#ffffff',
                      border: '1px solid #4a5568',
                      borderRadius: '4px'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}; 