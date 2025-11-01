import { useState, useEffect, useMemo } from "react";
import { useRxDB } from "@/context/RxDBContext";
import { taskFromRxDBFormat } from "@/db/rxdb";

interface StoredState {
  selectedFilters: Record<string, string[]>;
  selectedDimensionField: string;
  selectedDimensionValues: string[];
  filterOperator: "AND" | "OR";
  visibleFilters: Record<string, boolean>;
}

const loadStateFromStorage = (storageKey: string): Partial<StoredState> => {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
    return {};
  }
};

const saveStateToStorage = (storageKey: string, state: StoredState) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving state to localStorage:', error);
  }
};

interface UseRxDBFiltersProps {
  storageKey: string;
  excludedFields?: string[];
}

const DEFAULT_EXCLUDED_FIELDS = ['id', 'issue_number', 'number', 'body', 'html_url', 'links', 'title', 'Title', 'repository', 'repo_owner', 'state', 'customFields', 'updatedAt'];

export const useRxDBFilters = ({
  storageKey,
  excludedFields = DEFAULT_EXCLUDED_FIELDS
}: UseRxDBFiltersProps) => {
  const { db, isReady, error } = useRxDB();
  
  // Memoize excludedFields to prevent infinite loops
  const memoizedExcludedFields = useMemo(() => excludedFields, [JSON.stringify(excludedFields)]);
  
  // Load initial state from localStorage
  const storedState = useMemo(() => loadStateFromStorage(storageKey), [storageKey]);
  
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
    storedState.selectedFilters || {}
  );
  const [selectedDimensionField, setSelectedDimensionField] = useState<string>(
    storedState.selectedDimensionField || "labels"
  );
  const [selectedDimensionValues, setSelectedDimensionValues] = useState<string[]>(
    storedState.selectedDimensionValues || []
  );
  const [filterOperator, setFilterOperator] = useState<"AND" | "OR">(
    storedState.filterOperator || "AND"
  );
  const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>(
    storedState.visibleFilters || {}
  );

  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filterableFields, setFilterableFields] = useState<Record<string, string[]>>({});
  const [uniqueLabels, setUniqueLabels] = useState<string[]>([]);

  // Subscribe to all tasks from RxDB
  useEffect(() => {
    if (!db || !isReady) return;

    const subscription = db.tasks
      .find()
      .sort({ updatedAt: 'desc' })
      .$
      .subscribe((docs) => {
        const tasks = docs.map(taskFromRxDBFormat);
        setAllTasks(tasks);
        
        // Extract filterable fields
        const fields: Record<string, Set<string>> = {};
        const labels = new Set<string>();

        tasks.forEach((item: any) => {
          // Extract labels
          (item.labels || []).forEach((label: any) => {
            if (label.name) {
              labels.add(label.name);
            }
          });

          // Extract other fields
          Object.keys(item).forEach((key) => {
            if (memoizedExcludedFields.includes(key) || key === 'labels' || key === 'assignees') {
              return;
            }

            const value = item[key];
            
            if (value !== null && value !== undefined && 
                (typeof value === 'string' || typeof value === 'number')) {
              if (!fields[key]) {
                fields[key] = new Set();
              }
              fields[key].add(String(value));
            }
          });
        });

        // Convert to sorted arrays
        const result: Record<string, string[]> = {};
        Object.keys(fields).sort().forEach((key) => {
          const values = Array.from(fields[key]).sort();
          if (values.length > 0 && values.length < 100) {
            result[key] = values;
          }
        });

        setFilterableFields(result);
        setUniqueLabels(Array.from(labels).sort());
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, memoizedExcludedFields]);

  // Apply filters using RxDB query or in-memory filtering
  useEffect(() => {
    if (!db || !isReady || allTasks.length === 0) {
      setFilteredData([]);
      return;
    }

    const applyFilters = () => {
      let result = allTasks;
      
      const activeFilters = Object.entries(selectedFilters).filter(([_, values]) => values.length > 0);
      const hasAnyFilters = activeFilters.length > 0;

      if (hasAnyFilters) {
        result = result.filter((item: any) => {
          const fieldMatches: boolean[] = [];

          activeFilters.forEach(([fieldName, selectedValues]) => {
            if (fieldName === 'labels') {
              const matches = item.labels?.some((l: any) => selectedValues.includes(l.name));
              fieldMatches.push(matches || false);
            } else {
              const itemValue = String(item[fieldName] || '');
              const matches = selectedValues.includes(itemValue);
              fieldMatches.push(matches);
            }
          });

          if (filterOperator === "AND") {
            return fieldMatches.every(match => match === true);
          } else {
            return fieldMatches.some(match => match === true);
          }
        });
      }

      setFilteredData(result);
    };

    applyFilters();
  }, [db, isReady, allTasks, selectedFilters, filterOperator]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: StoredState = {
      selectedFilters,
      selectedDimensionField,
      selectedDimensionValues,
      filterOperator,
      visibleFilters,
    };
    saveStateToStorage(storageKey, state);
  }, [storageKey, selectedFilters, selectedDimensionField, selectedDimensionValues, filterOperator, visibleFilters]);

  // Initialize visible filters - only add new filters, don't reset existing ones
  useEffect(() => {
    const allFilterNames = [...Object.keys(filterableFields), 'labels'];
    
    // Only update if there are new filters to add
    setVisibleFilters(prev => {
      const newFiltersToAdd = allFilterNames.filter(
        name => prev[name] === undefined
      );
      
      if (newFiltersToAdd.length === 0) {
        return prev;
      }
      
      const updated = { ...prev };
      newFiltersToAdd.forEach(name => {
        updated[name] = false; // Default to hidden
      });
      return updated;
    });
  }, [filterableFields]);

  // Get dimension values based on selected field
  const dimensionValues = useMemo(() => {
    if (selectedDimensionField === 'labels') {
      return uniqueLabels;
    } else {
      return filterableFields[selectedDimensionField] || [];
    }
  }, [selectedDimensionField, uniqueLabels, filterableFields]);

  const handleFilterToggle = (fieldName: string, value: string) => {
    setSelectedFilters(prev => {
      const currentValues = prev[fieldName] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [fieldName]: newValues
      };
    });
  };

  const handleDimensionToggle = (value: string) => {
    setSelectedDimensionValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleFilterVisibility = (filterName: string) => {
    setVisibleFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  return {
    // Database state
    isReady,
    error,
    
    // Filter state
    selectedFilters,
    filterOperator,
    setFilterOperator,
    visibleFilters,
    filterableFields,
    uniqueLabels,
    handleFilterToggle,
    toggleFilterVisibility,
    
    // Dimension state
    selectedDimensionField,
    setSelectedDimensionField,
    selectedDimensionValues,
    setSelectedDimensionValues,
    dimensionValues,
    handleDimensionToggle,
    
    // Filtered data
    filteredData,
    allTasks,
  };
};

