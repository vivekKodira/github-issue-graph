import { Box, Button, HStack, Text } from "@chakra-ui/react";

interface RepoHeaderProps {
  repoLabel: string;
  onChangeRepo: () => void;
}

/** Slim persistent bar: which repo we're looking at + a way back to setup. */
export function RepoHeader({ repoLabel, onChangeRepo }: RepoHeaderProps) {
  return (
    <Box
      borderBottomWidth="1px"
      px={6}
      py={3}
      mb={6}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
    >
      <HStack gap={2}>
        <Text fontWeight="semibold">{repoLabel || "Your project"}</Text>
      </HStack>
      <Button variant="outline" size="sm" onClick={onChangeRepo}>
        Change repo
      </Button>
    </Box>
  );
}
