import { useEffect, useRef, useState } from "react";
import { createGraphData } from "./graphCreator";
import { createGraph } from "./graph";
import "./IssueGraph.css";
import { Box, Stack, Text } from "@chakra-ui/react";
import { ErrorBoundary } from "../ECharts/ErrorBoundary";

interface Issue {
  id: string;
  title: string;
  number: number;
  body: string;
  state: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  links?: Array<{
    type: string;
    id: string;
    url: string;
  }>;
}

interface PullRequest {
  id: string;
  title: string;
  number: number;
  body: string;
  state: string;
  author: string;
  assignees: string[];
  labels: Array<{ name: string; color: string }>;
  reviewers: string[];
  reviewStates: string[];
  reviewComments: Array<{
    body: string;
    createdAt: string;
    author: string;
    path: string;
    position: number | null;
    reviewState: string;
    reviewAuthor: string;
  }>;
  additions: number;
  deletions: number;
  changedFiles: number;
}

interface IssueGraphProps {
  issues: Issue[];
  prs: PullRequest[];
}

interface Filters {
  labels: string[];
  states: string[];
}

export const IssueGraph = ({ issues, prs }: IssueGraphProps) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<Filters>({
    labels: [],
    states: []
  });
  const [error, setError] = useState<Error | null>(null);

  // Extract unique labels and states from the data
  const uniqueLabels = Array.from(new Set(
    issues.flatMap(issue => (issue.labels || []).map(label => label.name))
  )).sort();

  const uniqueStates = Array.from(new Set(
    [...issues, ...prs].map(item => item.state)
  )).sort();

  // Filter the data based on selected filters
  const filterData = (issues: Issue[], prs: PullRequest[]) => {
    let filteredIssues = issues;
    let filteredPRs = prs;

    if (filters.states.length > 0) {
      filteredIssues = filteredIssues.filter(issue => 
        filters.states.includes(issue.state)
      );
      filteredPRs = filteredPRs.filter(pr => 
        filters.states.includes(pr.state)
      );
    }

    if (filters.labels.length > 0) {
      filteredIssues = filteredIssues.filter(issue => 
        issue.labels?.some(label => filters.labels.includes(label.name))
      );
      filteredPRs = filteredPRs.filter(pr => 
        pr.labels?.some(label => filters.labels.includes(label.name))
      );
    }

    return { filteredIssues, filteredPRs };
  };

  useEffect(() => {
    if (graphRef.current && issues) {
      try {
        const { filteredIssues, filteredPRs } = filterData(issues, prs);
        const graphData = createGraphData(filteredIssues, filteredPRs);
        createGraph(graphRef.current, graphData);
        setError(null);
      } catch (err) {
        console.error("Error creating graph:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [issues, prs, filters]);

  if (error) {
    throw error; // Re-throw to be caught by ErrorBoundary
  }

  return (
    <ErrorBoundary chartName="Issue Graph">
      <Box>
        <Stack direction="row" gap={4} mb={4}>
          <Box>
            <Text fontSize="sm" mb={1}>Filter by Labels</Text>
            <select
              multiple
              value={filters.labels}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                setFilters(prev => ({ ...prev, labels: selectedOptions }));
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                width: '200px',
                height: '120px'
              }}
            >
              {uniqueLabels.map(label => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <Text fontSize="xs" mt={1} color="gray.500">
              Hold Ctrl/Cmd to select multiple
            </Text>
          </Box>

          <Box>
            <Text fontSize="sm" mb={1}>Filter by States</Text>
            <select
              multiple
              value={filters.states}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                setFilters(prev => ({ ...prev, states: selectedOptions }));
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                width: '200px',
                height: '120px'
              }}
            >
              {uniqueStates.map(state => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <Text fontSize="xs" mt={1} color="gray.500">
              Hold Ctrl/Cmd to select multiple
            </Text>
          </Box>
        </Stack>

        <div ref={graphRef} className="graph-container" />
      </Box>
    </ErrorBoundary>
  );
};