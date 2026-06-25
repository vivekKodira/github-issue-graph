import { useMemo, useState, useEffect, type ReactNode } from "react";
import { Box, Button, HStack, Input, Stack, Text } from "@chakra-ui/react";

const STORAGE_KEY = "answerPrDateRange";

interface StoredRange {
  start: string; // yyyy-mm-dd ("" = unbounded)
  end: string;
}

function loadRange(): StoredRange {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { start: parsed.start || "", end: parsed.end || "" };
    }
  } catch {
    /* ignore malformed storage */
  }
  return { start: "", end: "" };
}

function toTime(value: unknown): number | null {
  if (value == null) return null;
  const d = typeof value === "string" || typeof value === "number" ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : null;
}

interface DateFilteredAnswerProps {
  prs: Record<string, unknown>[];
  /** Date field to filter on (default "createdAt"). */
  dateField?: string;
  children: (filtered: Record<string, unknown>[]) => ReactNode;
}

/**
 * Reusable date-range filter for PR-based answers. The selected window is
 * persisted to localStorage (shared key) so it carries across PR answers and
 * sessions. Rows without a parseable date are kept only while that bound is
 * unset.
 */
export function DateFilteredAnswer({
  prs,
  dateField = "createdAt",
  children,
}: DateFilteredAnswerProps) {
  const [range, setRange] = useState<StoredRange>(loadRange);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
  }, [range]);

  const filtered = useMemo(() => {
    const startTime = range.start ? new Date(range.start).getTime() : null;
    // Include the whole end day.
    const endTime = range.end ? new Date(range.end).getTime() + 86_399_999 : null;
    if (startTime == null && endTime == null) return prs;
    return prs.filter((row) => {
      const t = toTime(row[dateField]);
      if (t == null) return false;
      if (startTime != null && t < startTime) return false;
      if (endTime != null && t > endTime) return false;
      return true;
    });
  }, [prs, dateField, range]);

  const isFiltered = Boolean(range.start || range.end);

  return (
    <Stack gap={4}>
      <HStack wrap="wrap" gap={3} align="end">
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>
            From
          </Text>
          <Input
            type="date"
            size="sm"
            aria-label="Filter PRs from date"
            value={range.start}
            max={range.end || undefined}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
          />
        </Box>
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>
            To
          </Text>
          <Input
            type="date"
            size="sm"
            aria-label="Filter PRs to date"
            value={range.end}
            min={range.start || undefined}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
          />
        </Box>
        {isFiltered && (
          <Button size="sm" variant="ghost" onClick={() => setRange({ start: "", end: "" })}>
            Clear
          </Button>
        )}
        <Text fontSize="sm" color="fg.muted">
          Showing <strong>{filtered.length}</strong>
          {isFiltered ? ` of ${prs.length}` : ""} PRs
        </Text>
      </HStack>

      {filtered.length === 0 ? (
        <Box py={12} textAlign="center" color="fg.muted">
          {prs.length === 0
            ? "No pull requests found for this repository."
            : "No pull requests in this date range — try widening it or clearing the filter."}
        </Box>
      ) : (
        children(filtered)
      )}
    </Stack>
  );
}
