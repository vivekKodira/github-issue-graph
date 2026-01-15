import { useState, useMemo } from "react";
import { Box, Text, VStack, Input } from "@chakra-ui/react";
import { ECharts } from "./ECharts";
import { ErrorBoundary } from "./ErrorBoundary";

interface TimelinePlanningChartProps {
  filteredData: unknown[];
  filterableFields: Record<string, string[]>;
  styleOptions?: Record<string, unknown>;
}

interface ScheduledTask {
  issue: unknown;
  developerIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  issueTitle: string;
  issueNumber: string | number;
}

type ViewMode = 'all' | 'outliers-only' | 'critical-path' | 'workload-balance';
type SortStrategy = 'largest-first' | 'smallest-first' | 'round-robin';

export const TimelinePlanningChart = ({
  filteredData,
  filterableFields,
  styleOptions,
}: TimelinePlanningChartProps) => {
  const [selectedEstimationField, setSelectedEstimationField] = useState<string>("");
  const [numDevelopers, setNumDevelopers] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [outlierThreshold, setOutlierThreshold] = useState<string>("");
  const [sortStrategy, setSortStrategy] = useState<SortStrategy>('largest-first');
  const [holidays, setHolidays] = useState<number[]>([]); // 0=Sun, 1=Mon, ..., 6=Sat

  // Filter to only numeric fields (fields that have numeric values)
  const numericFields = useMemo(() => {
    const fields: string[] = [];
    
    if (!filteredData || filteredData.length === 0) {
      return fields;
    }

    // Check each field in filterableFields to see if it contains numeric values
    Object.keys(filterableFields).forEach((fieldName) => {
      // Sample a few issues to check if the field is numeric
      const sampleSize = Math.min(5, filteredData.length);
      let hasNumericValue = false;
      
      for (let i = 0; i < sampleSize; i++) {
        const issue = filteredData[i];
        const value = (issue as Record<string, unknown>)[fieldName] 
          ?? (issue as { customFields?: Record<string, unknown> })?.customFields?.[fieldName];
        
        if (value !== null && value !== undefined) {
          const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
          if (!isNaN(numValue) && isFinite(numValue)) {
            hasNumericValue = true;
            break;
          }
        }
      }
      
      if (hasNumericValue) {
        fields.push(fieldName);
      }
    });

    return fields.sort();
  }, [filterableFields, filteredData]);

  // Extract issues with their numeric values
  const issuesWithValues = useMemo(() => {
    if (!selectedEstimationField || !filteredData || filteredData.length === 0) {
      return [];
    }

    const issues: Array<{ issue: unknown; value: number }> = [];
    
    filteredData.forEach((issue) => {
      // Check both direct field and customFields
      const rawValue = (issue as Record<string, unknown>)[selectedEstimationField] 
        ?? (issue as { customFields?: Record<string, unknown> })?.customFields?.[selectedEstimationField];
      
      if (rawValue !== null && rawValue !== undefined) {
        const numValue = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
        if (!isNaN(numValue) && isFinite(numValue) && numValue > 0) {
          issues.push({ issue, value: numValue });
        }
      }
    });

    return issues;
  }, [selectedEstimationField, filteredData]);

  // Format the field name for display (e.g., "Estimate (days)" -> "days")
  const getUnitFromFieldName = (fieldName: string): string => {
    const lower = fieldName.toLowerCase();
    if (lower.includes('day')) return 'days';
    if (lower.includes('hour')) return 'hours';
    if (lower.includes('week')) return 'weeks';
    if (lower.includes('month')) return 'months';
    return 'units';
  };

  // Schedule tasks using a greedy algorithm
  const scheduledTasks = useMemo(() => {
    if (issuesWithValues.length === 0 || numDevelopers < 1 || !selectedEstimationField) {
      return [];
    }

    // Get unit for conversion
    const unit = getUnitFromFieldName(selectedEstimationField);

    // Sort issues based on selected strategy
    let sortedIssues = [...issuesWithValues];
    switch (sortStrategy) {
      case 'largest-first':
        sortedIssues = sortedIssues.sort((a, b) => b.value - a.value);
        break;
      case 'smallest-first':
        sortedIssues = sortedIssues.sort((a, b) => a.value - b.value);
        break;
      case 'round-robin':
        // For round-robin, we'll distribute evenly, so keep original order
        break;
      default:
        sortedIssues = sortedIssues.sort((a, b) => b.value - a.value);
    }

    // Track when each developer becomes available (in milliseconds)
    const developerAvailability: number[] = new Array(numDevelopers).fill(0);
    const scheduled: ScheduledTask[] = [];

    // Get base start time (use provided start date or current time)
    const baseTime = startDate 
      ? new Date(startDate).getTime() 
      : Date.now();
    
    const holidaySet = new Set(holidays);

    const calculateEndTime = (start: number, duration: number, holidayDays: Set<number>) => {
      let current = new Date(start);
      let remaining = duration;
      
      // Safety break to prevent infinite loops if all days are holidays
      if (holidayDays.size === 7) return start + duration;

      while (remaining > 0) {
        const day = current.getDay();
        
        // Calculate time until end of current day
        const nextDay = new Date(current);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        const msUntilNextDay = nextDay.getTime() - current.getTime();
        
        if (holidayDays.has(day)) {
          // It's a holiday, skip to next day without reducing duration
          // But only if we are not already at the exact end of the day (which is start of next)
          // Actually, if we are at start of holiday, skip it.
          // If msUntilNextDay is effectively a full day (or close), skip it.
          // If we are in middle of holiday, skip rest.
          current = nextDay;
        } else {
          // It's a work day
          const timeToAdvance = Math.min(remaining, msUntilNextDay);
          current = new Date(current.getTime() + timeToAdvance);
          remaining -= timeToAdvance;
        }
      }
      return current.getTime();
    };

    // Convert estimation value to milliseconds based on unit
    const convertToMs = (value: number, unit: string): number => {
      if (unit === 'hours') {
        return value * 1000 * 60 * 60;
      } else if (unit === 'days') {
        return value * 1000 * 60 * 60 * 24;
      } else if (unit === 'weeks') {
        return value * 1000 * 60 * 60 * 24 * 7;
      } else if (unit === 'months') {
        return value * 1000 * 60 * 60 * 24 * 30;
      }
      // For 'units', assume it's in hours as default
      return value * 1000 * 60 * 60;
    };

    sortedIssues.forEach(({ issue, value }) => {
      // Find the developer with the earliest availability
      let earliestDeveloper = 0;
      let earliestTime = developerAvailability[0];

      for (let i = 1; i < numDevelopers; i++) {
        if (developerAvailability[i] < earliestTime) {
          earliestTime = developerAvailability[i];
          earliestDeveloper = i;
        }
      }

      // Convert duration to milliseconds
      const durationMs = convertToMs(value, unit);

      // Schedule the task
      // Schedule the task
      const startTime = baseTime + earliestTime;
      const endTime = calculateEndTime(startTime, durationMs, holidaySet);
      
      const issueObj = issue as { 
        title?: string; 
        issue_number?: number; 
        number?: number; 
        id?: string;
      };
      const issueTitle = issueObj.title || 'Untitled';
      const issueNumber = issueObj.issue_number || issueObj.number || issueObj.id || 'N/A';

      scheduled.push({
        issue,
        developerIndex: earliestDeveloper,
        startTime,
        endTime,
        duration: value, // Keep original value for display
        issueTitle,
        issueNumber,
      });

      // Update developer availability (in milliseconds from baseTime)
      developerAvailability[earliestDeveloper] = endTime - baseTime;
    });

    return scheduled;
  }, [issuesWithValues, numDevelopers, startDate, selectedEstimationField, sortStrategy, holidays]);

  const unit = selectedEstimationField ? getUnitFromFieldName(selectedEstimationField) : 'units';

  // Calculate outliers
  const outliers = useMemo(() => {
    if (!selectedEstimationField || scheduledTasks.length === 0) {
      return [];
    }
    const threshold = parseFloat(outlierThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      return [];
    }
    return scheduledTasks.filter(task => task.duration > threshold);
  }, [scheduledTasks, selectedEstimationField, outlierThreshold]);

  // Calculate workload per developer
  const developerWorkload = useMemo(() => {
    const workload: Record<number, { total: number; tasks: number; maxEndTime: number }> = {};
    scheduledTasks.forEach(task => {
      if (!workload[task.developerIndex]) {
        workload[task.developerIndex] = { total: 0, tasks: 0, maxEndTime: 0 };
      }
      workload[task.developerIndex].total += task.duration;
      workload[task.developerIndex].tasks += 1;
      workload[task.developerIndex].maxEndTime = Math.max(
        workload[task.developerIndex].maxEndTime,
        task.endTime
      );
    });
    return workload;
  }, [scheduledTasks]);

  // Identify critical path tasks (tasks on the longest path)
  const criticalPathTasks = useMemo(() => {
    if (scheduledTasks.length === 0) return new Set<number>();
    
    // Find the developer with the longest total time
    const developerEndTimes = new Array(numDevelopers).fill(0);
    scheduledTasks.forEach(task => {
      developerEndTimes[task.developerIndex] = Math.max(
        developerEndTimes[task.developerIndex],
        task.endTime
      );
    });
    const maxTime = Math.max(...developerEndTimes);
    
    // Tasks that end at or near maxTime are on critical path
    const criticalSet = new Set<number>();
    scheduledTasks.forEach((task, index) => {
      if (task.endTime >= maxTime - 1000) { // Within 1 second of max
        criticalSet.add(index);
      }
    });
    return criticalSet;
  }, [scheduledTasks, numDevelopers]);

  // Filter scheduled tasks based on view mode
  const filteredScheduledTasks = useMemo(() => {
    switch (viewMode) {
      case 'outliers-only':
        return outliers;
      case 'critical-path':
        return scheduledTasks.filter((_, index) => criticalPathTasks.has(index));
      case 'workload-balance':
        // Show all tasks but we'll highlight workload in the chart
        return scheduledTasks;
      case 'all':
      default:
        return scheduledTasks;
    }
  }, [scheduledTasks, viewMode, outliers, criticalPathTasks]);

  // Calculate total project duration
  const totalDuration = useMemo(() => {
    if (scheduledTasks.length === 0) return 0;
    const maxEndTime = Math.max(...scheduledTasks.map(t => t.endTime));
    const minStartTime = Math.min(...scheduledTasks.map(t => t.startTime));
    const durationMs = maxEndTime - minStartTime;
    
    // Convert milliseconds to the appropriate unit
    if (unit === 'hours') {
      return durationMs / (1000 * 60 * 60);
    } else if (unit === 'days') {
      return durationMs / (1000 * 60 * 60 * 24);
    } else if (unit === 'weeks') {
      return durationMs / (1000 * 60 * 60 * 24 * 7);
    } else if (unit === 'months') {
      return durationMs / (1000 * 60 * 60 * 24 * 30);
    }
    // For 'units', we treated them as hours when converting, so convert back from hours
    return durationMs / (1000 * 60 * 60);
  }, [scheduledTasks, unit]);

  // Prepare chart data
  const chartOptions = useMemo(() => {
    if (filteredScheduledTasks.length === 0) {
      return null;
    }

    // Group tasks by developer and create y-axis labels
    const developerLabels: string[] = [];
    for (let i = 0; i < numDevelopers; i++) {
      developerLabels.push(`Developer ${i + 1}`);
    }

    // Define dimensions following ECharts Gantt pattern
    // Define dimensions following ECharts Gantt pattern
    // const DIM_CATEGORY_INDEX = 0;
    // const DIM_TIME_START = 1;
    // const DIM_TIME_END = 2;
    // const DIM_ISSUE_TITLE = 3;
    // const DIM_ISSUE_NUMBER = 4;
    // const DIM_DURATION = 5;

    // Create data for custom series: [categoryIndex, startTime, endTime, ...metadata]
    const allTasksData = filteredScheduledTasks.map((task, index) => {
      const originalIndex = scheduledTasks.indexOf(task);
      const isCritical = criticalPathTasks.has(originalIndex);
      const isOutlier = outliers.includes(task);
      return [
        task.developerIndex, // DIM_CATEGORY_INDEX - y-axis category index (number)
        task.startTime,      // DIM_TIME_START - x-axis start
        task.endTime,        // DIM_TIME_END - x-axis end
        task.issueTitle,     // DIM_ISSUE_TITLE - for tooltip
        task.issueNumber,    // DIM_ISSUE_NUMBER - for tooltip
        task.duration,       // DIM_DURATION - for tooltip
        isCritical,          // DIM_IS_CRITICAL - for styling
        isOutlier,           // DIM_IS_OUTLIER - for styling
      ];
    });

    const minTime = Math.min(...filteredScheduledTasks.map(t => t.startTime));
    const maxTime = Math.max(...filteredScheduledTasks.map(t => t.endTime));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          if (!data || !Array.isArray(data)) return '';
          
          const categoryIndex = data[0];
          const startTime = data[1];
          const endTime = data[2];
          const issueTitle = data[3] || 'Untitled';
          const issueNumber = data[4] || 'N/A';
          const duration = data[5] || 0;
          
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);
          
          return `
            <div style="padding: 8px;">
              <strong>${issueTitle}</strong><br/>
              Issue #${issueNumber}<br/>
              Developer: ${developerLabels[categoryIndex]}<br/>
              Start: ${startDate.toLocaleString()}<br/>
              End: ${endDate.toLocaleString()}<br/>
              Duration: ${duration.toFixed(2)} ${unit}
            </div>
          `;
        },
      },
      grid: {
        left: '15%',
        right: '10%',
        top: '15%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        min: minTime,
        max: maxTime,
        scale: true,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          },
          color: '#ffffff',
        },
        name: 'Timeline',
        nameTextStyle: {
          color: '#ffffff',
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: numDevelopers,
        axisLabel: {
          color: '#ffffff',
          fontSize: 12,
          formatter: (value: number) => {
            const index = Math.floor(value);
            return developerLabels[index] || '';
          },
        },
        inverse: true,
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: 0,
          start: 0,
          end: 100,
          bottom: '5%',
          height: 20,
          borderColor: '#ccc',
          textStyle: {
            color: '#ffffff',
          },
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100,
        },
      ],
      series: [
        {
          name: 'Tasks',
          type: 'custom',
          dimensions: [
            'categoryIndex',
            'startTime',
            'endTime',
            'issueTitle',
            'issueNumber',
            'duration',
            'isCritical',
            'isOutlier'
          ],
          encode: {
            x: [1, 2], // startTime and endTime for x-axis
            y: 0,      // categoryIndex for y-axis
            tooltip: [0, 1, 2, 3, 4, 5]
          },
          renderItem: (params: any, api: any) => {
            try {
              const DIM_CATEGORY_INDEX = 0;
              const DIM_TIME_START = 1;
              const DIM_TIME_END = 2;
              const DIM_IS_CRITICAL = 6;
              const DIM_IS_OUTLIER = 7;
              
              const categoryIndex = api.value(DIM_CATEGORY_INDEX);
              const startTime = api.value(DIM_TIME_START);
              const endTime = api.value(DIM_TIME_END);
              const isCritical = api.value(DIM_IS_CRITICAL);
              const isOutlier = api.value(DIM_IS_OUTLIER);
              
              // Get coordinates - pass categoryIndex as number (not string)
              const startCoord = api.coord([startTime, categoryIndex]);
              const endCoord = api.coord([endTime, categoryIndex]);
              
              if (!startCoord || !endCoord) {
                return null;
              }
              
              if (startCoord[0] === undefined || endCoord[0] === undefined || 
                  startCoord[1] === undefined || endCoord[1] === undefined) {
                return null;
              }
              
              const barLength = endCoord[0] - startCoord[0];
              // Get the height corresponds to length 1 on y axis
              const barHeight = api.size([0, 1])[1] * 0.6;
              const x = startCoord[0];
              const y = startCoord[1] - barHeight;

              // Color based on developer index, with special styling for critical/outlier
              const devIndex = categoryIndex;
              let color = `hsl(${(devIndex * 60) % 360}, 70%, 60%)`;
              let strokeColor = '#fff';
              let strokeWidth = 1;
              
              if (isCritical) {
                color = `hsl(${(devIndex * 60) % 360}, 80%, 45%)`;
                strokeColor = '#ff0000';
                strokeWidth = 2;
              } else if (isOutlier) {
                color = `hsl(${(devIndex * 60) % 360}, 90%, 50%)`;
                strokeColor = '#ff8800';
                strokeWidth = 2;
              }

              const issueNumber = api.value(4);
              const text = barLength > 40 ? `#${issueNumber}` : '';

              return {
                type: 'group',
                children: [
                  {
                    type: 'rect',
                    shape: {
                      x: x,
                      y: y,
                      width: barLength,
                      height: barHeight,
                    },
                    style: {
                      fill: color,
                      stroke: strokeColor,
                      lineWidth: strokeWidth,
                    },
                  },
                  {
                    type: 'text',
                    shape: {
                      x: x + barLength / 2,
                      y: y + barHeight / 2,
                    },
                    style: {
                      text: text,
                      textFill: '#fff',
                      textAlign: 'center',
                      textVerticalAlign: 'middle',
                      fontSize: 10,
                      fontWeight: 'bold',
                    },
                  },
                ],
              };
            } catch (error) {
              console.error('TimelinePlanningChart: Error in renderItem', error);
              return null;
            }
          },
          data: allTasksData,
        },
      ],
    };
  }, [filteredScheduledTasks, unit, numDevelopers, scheduledTasks, criticalPathTasks, outliers]);

  return (
    <Box id="timeline-planning-chart" mt={4} p={4} borderWidth="1px" borderRadius="8px" borderColor="gray.200">
      <VStack align="stretch" gap={4}>
        <Text fontSize="md" fontWeight="semibold">
          Timeline Planning Chart
        </Text>

        {/* Field Selector */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Select Estimation Field
          </Text>
          <select
            value={selectedEstimationField}
            onChange={(e) => setSelectedEstimationField(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              fontSize: "14px",
              width: "100%",
              maxWidth: "300px",
              backgroundColor: "transparent",
              color: "inherit",
              cursor: "pointer"
            }}
          >
            <option value="">-- Select a field --</option>
            {numericFields.map((fieldName) => (
              <option key={fieldName} value={fieldName}>
                {fieldName}
              </option>
            ))}
          </select>
          {numericFields.length === 0 && (
            <Text fontSize="xs" color="gray.400" mt={1}>
              No numeric fields available. Apply filters to see available fields.
            </Text>
          )}
        </Box>

        {/* Number of Developers Input */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Number of Developers
          </Text>
          <Input
            type="number"
            min={1}
            value={numDevelopers}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value) && value >= 1) {
                setNumDevelopers(value);
              } else if (e.target.value === '') {
                setNumDevelopers(1);
              }
            }}
            placeholder="Enter number of developers"
            style={{
              maxWidth: "300px"
            }}
          />
        </Box>

        {/* Start Date Input */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Project Start Date (Optional)
          </Text>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Select start date"
            style={{
              maxWidth: "300px"
            }}
          />
          <Text fontSize="xs" color="gray.400" mt={1}>
            If not set, timeline will start from now
          </Text>
        </Box>

        {/* Holiday Selection */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Weekly Holidays
          </Text>
          <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(120px, 1fr))" gap={2}>
            {[
              { label: "Monday", value: 1 },
              { label: "Tuesday", value: 2 },
              { label: "Wednesday", value: 3 },
              { label: "Thursday", value: 4 },
              { label: "Friday", value: 5 },
              { label: "Saturday", value: 6 },
              { label: "Sunday", value: 0 },
            ].map((day) => (
              <Box key={day.value} display="flex" alignItems="center" gap={2}>
                <input
                  type="checkbox"
                  id={`holiday-${day.value}`}
                  checked={holidays.includes(day.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setHolidays(prev => [...prev, day.value]);
                    } else {
                      setHolidays(prev => prev.filter(h => h !== day.value));
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor={`holiday-${day.value}`} style={{ cursor: "pointer", fontSize: "14px" }}>
                  {day.label}
                </label>
              </Box>
            ))}
          </Box>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Selected days will be treated as non-working days
          </Text>
        </Box>

        {/* View Mode Selector */}
        {selectedEstimationField && (
          <Box>
            <Text fontSize="sm" mb={2}>
              View Mode
            </Text>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #E2E8F0",
                fontSize: "14px",
                width: "100%",
                maxWidth: "300px",
                backgroundColor: "transparent",
                color: "inherit",
                cursor: "pointer"
              }}
            >
              <option value="all">All Tasks</option>
              <option value="outliers-only">Outliers Only</option>
              <option value="critical-path">Critical Path</option>
              <option value="workload-balance">Workload Balance</option>
            </select>
            <Text fontSize="xs" color="gray.400" mt={1}>
              {viewMode === 'outliers-only' && 'Show only tasks above threshold'}
              {viewMode === 'critical-path' && 'Show tasks on the longest path'}
              {viewMode === 'workload-balance' && 'Show all tasks with workload indicators'}
              {viewMode === 'all' && 'Show all scheduled tasks'}
            </Text>
          </Box>
        )}

        {/* Outlier Threshold Input */}
        {selectedEstimationField && (
          <Box>
            <Text fontSize="sm" mb={2}>
              Outlier Threshold ({unit})
            </Text>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={outlierThreshold}
              onChange={(e) => {
                setOutlierThreshold(e.target.value);
              }}
              placeholder={`Enter threshold (e.g., 5 for ${unit})`}
              style={{
                maxWidth: "300px"
              }}
            />
            <Text fontSize="xs" color="gray.400" mt={1}>
              Tasks with estimates above this value will be highlighted as outliers
            </Text>
            {outliers.length > 0 && (
              <Text fontSize="xs" color="orange.500" mt={1} fontWeight="medium">
                ⚠️ {outliers.length} outlier{outliers.length !== 1 ? 's' : ''} detected
              </Text>
            )}
          </Box>
        )}

        {/* Sort Strategy Selector */}
        {selectedEstimationField && (
          <Box>
            <Text fontSize="sm" mb={2}>
              Scheduling Strategy
            </Text>
            <select
              value={sortStrategy}
              onChange={(e) => setSortStrategy(e.target.value as SortStrategy)}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #E2E8F0",
                fontSize: "14px",
                width: "100%",
                maxWidth: "300px",
                backgroundColor: "transparent",
                color: "inherit",
                cursor: "pointer"
              }}
            >
              <option value="largest-first">Largest First (Better Load Balance)</option>
              <option value="smallest-first">Smallest First (Quick Wins)</option>
              <option value="round-robin">Round Robin (Even Distribution)</option>
            </select>
            <Text fontSize="xs" color="gray.400" mt={1}>
              Choose how tasks are prioritized when scheduling
            </Text>
          </Box>
        )}

        {/* Summary Statistics */}
        {scheduledTasks.length > 0 && (
          <Box
            p={4}
            bg="blue.50"
            borderRadius="4px"
            borderWidth="1px"
            borderColor="blue.200"
          >
            <VStack align="stretch" gap={1}>
              <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                Schedule Summary
              </Text>
              <Text fontSize="sm" color="gray.600">
                Total Issues: {scheduledTasks.length}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Total Duration: {totalDuration.toFixed(2)} {unit}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Developers: {numDevelopers}
              </Text>
              {criticalPathTasks.size > 0 && (
                <Text fontSize="sm" color="red.600" fontWeight="medium">
                  Critical Path: {criticalPathTasks.size} task{criticalPathTasks.size !== 1 ? 's' : ''}
                </Text>
              )}
              {outliers.length > 0 && (
                <Text fontSize="sm" color="orange.600" fontWeight="medium">
                  Outliers: {outliers.length} task{outliers.length !== 1 ? 's' : ''}
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {/* Workload Balance View */}
        {viewMode === 'workload-balance' && scheduledTasks.length > 0 && (
          <Box
            p={4}
            bg="purple.50"
            borderRadius="4px"
            borderWidth="1px"
            borderColor="purple.200"
          >
            <VStack align="stretch" gap={2}>
              <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                Developer Workload
              </Text>
              {Object.entries(developerWorkload).map(([devIndex, workload]) => {
                const devLabel = `Developer ${Number(devIndex) + 1}`;
                // Calculate workload duration from maxEndTime - minStartTime for this developer
                const developerTasks = scheduledTasks.filter(t => t.developerIndex === Number(devIndex));
                const minStart = Math.min(...developerTasks.map(t => t.startTime));
                const maxEnd = Math.max(...developerTasks.map(t => t.endTime));
                const durationMs = maxEnd - minStart;
                
                // Convert to the appropriate unit
                let workloadInUnit = 0;
                if (unit === 'hours') {
                  workloadInUnit = durationMs / (1000 * 60 * 60);
                } else if (unit === 'days') {
                  workloadInUnit = durationMs / (1000 * 60 * 60 * 24);
                } else if (unit === 'weeks') {
                  workloadInUnit = durationMs / (1000 * 60 * 60 * 24 * 7);
                } else if (unit === 'months') {
                  workloadInUnit = durationMs / (1000 * 60 * 60 * 24 * 30);
                } else {
                  workloadInUnit = durationMs / (1000 * 60 * 60);
                }
                
                return (
                  <Box key={devIndex} p={2} bg="white" borderRadius="2px">
                    <Text fontSize="xs" fontWeight="medium" color="purple.800">
                      {devLabel}
                    </Text>
                    <Text fontSize="xs" color="purple.600">
                      {workload.tasks} task{workload.tasks !== 1 ? 's' : ''} • {workloadInUnit.toFixed(2)} {unit}
                    </Text>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* Chart Display */}
        {chartOptions ? (
          <Box mt={4}>
            <ErrorBoundary chartName="Timeline Planning">
              <ECharts 
                option={chartOptions} 
                style={{ height: Math.max(400, filteredScheduledTasks.length * 40), ...styleOptions }} 
              />
            </ErrorBoundary>
            <Box mt={2} fontSize="xs" color="gray.500">
              <Text>Legend: Red border = Critical Path • Orange border = Outlier</Text>
            </Box>
          </Box>
        ) : (
          <Box p={4} textAlign="center">
            {!selectedEstimationField && (
              <Text fontSize="sm" color="gray.400" fontStyle="italic">
                Select an estimation field to generate timeline planning chart
              </Text>
            )}
            {selectedEstimationField && scheduledTasks.length === 0 && (
              <Text fontSize="sm" color="orange.400" fontStyle="italic">
                No valid numeric values found in selected field for the filtered issues
              </Text>
            )}
            {selectedEstimationField && scheduledTasks.length > 0 && filteredScheduledTasks.length === 0 && (
              <Text fontSize="sm" color="orange.400" fontStyle="italic">
                No tasks match the current view filter. Try changing the view mode or threshold.
              </Text>
            )}
            {filteredData.length === 0 && (
              <Text fontSize="sm" color="gray.400" fontStyle="italic">
                Apply filters to see timeline planning for selected issues
              </Text>
            )}
          </Box>
        )}
      </VStack>
    </Box>
  );
};

