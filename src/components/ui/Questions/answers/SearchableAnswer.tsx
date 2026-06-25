import { useState, type ReactNode } from "react";
import { Box, Input } from "@chakra-ui/react";

interface SearchableAnswerProps {
  placeholder?: string;
  children: (searchTerm: string) => ReactNode;
}

/**
 * Provides a "search by name" box and passes the term to its child chart.
 * Used by the per-person answers (assignees / reviewers / authors) that
 * previously shared a single search box in the Team tab.
 */
export function SearchableAnswer({ placeholder = "Search by name…", children }: SearchableAnswerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <Box>
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        mb={4}
        maxW="320px"
      />
      {children(searchTerm)}
    </Box>
  );
}
