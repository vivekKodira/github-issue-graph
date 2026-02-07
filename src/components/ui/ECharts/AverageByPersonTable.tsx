import { useState, useMemo } from "react";
import { Box, Table } from "@chakra-ui/react";

export interface AverageByPersonTableProps {
  personLabel: string;
  valueLabel: string;
  averages: Record<string, number>;
  valueFormat?: (n: number) => string;
  title?: string;
}

type SortBy = "person" | "value";
type SortDir = "asc" | "desc";

export const AverageByPersonTable = ({
  personLabel,
  valueLabel,
  averages,
  valueFormat = (n) => Number(n).toFixed(2),
  title = "Average by Person",
}: AverageByPersonTableProps) => {
  const [sortBy, setSortBy] = useState<SortBy>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedEntries = useMemo(() => {
    const entries = Object.entries(averages);
    const mult = sortDir === "asc" ? 1 : -1;
    if (sortBy === "person") {
      return [...entries].sort((a, b) => mult * a[0].localeCompare(b[0]));
    }
    return [...entries].sort((a, b) => mult * (a[1] - b[1]));
  }, [averages, sortBy, sortDir]);

  const handleHeaderClick = (column: SortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "person" ? "asc" : "desc");
    }
  };

  return (
    <Box minW="220px" bg="#23272f" borderRadius="md" p={4}>
      <h4 style={{ color: "#ffffff", marginBottom: "12px", fontSize: "16px", fontWeight: "bold" }}>
        {title}
      </h4>
      <Table.Root w="full">
        <Table.Header>
          <Table.Row>
            <Table.Cell
              fontWeight="bold"
              cursor="pointer"
              onClick={() => handleHeaderClick("person")}
              style={{ color: "#ffffff", userSelect: "none" }}
            >
              {personLabel}
              {sortBy === "person" && (sortDir === "asc" ? " ↑" : " ↓")}
            </Table.Cell>
            <Table.Cell
              fontWeight="bold"
              textAlign="right"
              cursor="pointer"
              onClick={() => handleHeaderClick("value")}
              style={{ color: "#ffffff", userSelect: "none" }}
            >
              {valueLabel}
              {sortBy === "value" && (sortDir === "asc" ? " ↑" : " ↓")}
            </Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sortedEntries.map(([person, avg]) => (
            <Table.Row key={person}>
              <Table.Cell style={{ color: "#ffffff" }}>{person}</Table.Cell>
              <Table.Cell textAlign="right" style={{ color: "#ffffff" }}>
                {valueFormat(avg)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
};
