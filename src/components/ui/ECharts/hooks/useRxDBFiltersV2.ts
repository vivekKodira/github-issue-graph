import { useState, useEffect, useMemo } from "react";
import { useRxDB } from "@/context/RxDBContext";
import { taskFromRxDBFormat } from "@/db/rxdb";
import { 
  buildCompleteQuery, 
  validateMangoQuery,
  SimpleFilters,
  AdvancedFilters 
} from "@/util/mangoQueryBuilder";

interface StoredState {
  selectedFilters: Record<string, string[]>;
  selectedDimensionField: string;
  selectedDimensionValues: string[];
  filterOperator: "AND" | "OR";
  visibleFilters: Record<string, boolean>;
  advancedFilters?: AdvancedFilters;
  filterMode?: 'simple' | 'advanced' | 'expert';
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

const DEFAULT_EXCLUDED_FIELDS = ['id', 'issue_number', 'number', 'body', 'html_url', 'links', 'title', 'Title', 'repository', 'repo_owner', 'state', 'customFields', 'updatedAt', 'createdAt'];

export const useRxDBFiltersV2 = ({
  storageKey,
  excludedFields = DEFAULT_EXCLUDED_FIELDS
}: UseRxDBFiltersProps) => {
  const { db, isReady, error } = useRxDB();
  
  const memoizedExcludedFields = useMemo(() => excludedFields, [JSON.stringify(excludedFields)]);
  const storedState = useMemo(() => loadStateFromStorage(storageKey), [storageKey]);
  
  // Simple filter state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
    storedState.selectedFilters || {}
  );
  const [filterOperator, setFilterOperator] = useState<"AND" | "OR">(
    storedState.filterOperator || "AND"
  );
  const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>(
    storedState.visibleFilters || {}
  );

  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(
    storedState.advancedFilters || {}
  );

  // Expert mode state
  const [customQuery, setCustomQuery] = useState<any>(null);
  const [queryValidation, setQueryValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });

  // Filter mode: 'simple', 'advanced', 'expert'
  const [filterMode, setFilterMode] = useState<'simple' | 'advanced' | 'expert'>(
    storedState.filterMode || 'simple'
  );

  // Dimension state
  const [selectedDimensionField, setSelectedDimensionField] = useState<string>(
    storedState.selectedDimensionField || "labels"
  );
  const [selectedDimensionValues, setSelectedDimensionValues] = useState<string[]>(
    storedState.selectedDimensionValues || []
  );

  // Data state
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filterableFields, setFilterableFields] = useState<Record<string, string[]>>({});
  const [uniqueLabels, setUniqueLabels] = useState<string[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState<any>({});

  // Subscribe to ALL tasks (for extracting filterable fields/metadata)
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

  // Apply filters using Mango query (reactive!)
  useEffect(() => {
    if (!db || !isReady) return;

    // Build Mango query based on current filter mode
    const query = filterMode === 'expert' && customQuery
      ? customQuery
      : buildCompleteQuery(
          selectedFilters,
          filterOperator,
          advancedFilters,
          filterMode === 'expert' ? customQuery : undefined
        );

    // Store the generated query for display
    setGeneratedQuery(query.selector);

    // Execute reactive query with Mango selector
    const subscription = db.tasks
      .find(query)
      .sort({ createdAt: 'desc' })
      .$
      .subscribe((docs) => {
        const tasks = docs.map(taskFromRxDBFormat);
        setFilteredData(tasks);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, selectedFilters, filterOperator, advancedFilters, customQuery, filterMode]);

  // Save state to localStorage
  useEffect(() => {
    const state: StoredState = {
      selectedFilters,
      selectedDimensionField,
      selectedDimensionValues,
      filterOperator,
      visibleFilters,
      advancedFilters,
      filterMode
    };
    saveStateToStorage(storageKey, state);
  }, [storageKey, selectedFilters, selectedDimensionField, selectedDimensionValues, 
      filterOperator, visibleFilters, advancedFilters, filterMode]);

  // Get dimension values based on selected field
  const dimensionValues = useMemo(() => {
    if (selectedDimensionField === 'labels') {
      return uniqueLabels;
    }
    return filterableFields[selectedDimensionField] || [];
  }, [selectedDimensionField, uniqueLabels, filterableFields]);

  // Handlers
  const handleFilterToggle = (fieldName: string, value: string) => {
    setSelectedFilters((prev) => {
      const currentValues = prev[fieldName] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [fieldName]: newValues };
    });
  };

  const handleDimensionToggle = (value: string) => {
    setSelectedDimensionValues((prev) =>
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

  const applyCustomQuery = (query: any) => {
    const validation = validateMangoQuery(query);
    setQueryValidation(validation);
    
    if (validation.valid) {
      setCustomQuery(query);
    }
  };

  const updateAdvancedFilters = (updates: Partial<AdvancedFilters>) => {
    setAdvancedFilters(prev => ({ ...prev, ...updates }));
  };

  return {
    // Database state
    isReady,
    error,
    
    // Filter mode
    filterMode,
    setFilterMode,
    
    // Simple filter state
    selectedFilters,
    filterOperator,
    setFilterOperator,
    visibleFilters,
    filterableFields,
    uniqueLabels,
    handleFilterToggle,
    toggleFilterVisibility,
    
    // Advanced filter state
    advancedFilters,
    updateAdvancedFilters,
    
    // Expert mode state
    customQuery,
    applyCustomQuery,
    queryValidation,
    generatedQuery,
    
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

