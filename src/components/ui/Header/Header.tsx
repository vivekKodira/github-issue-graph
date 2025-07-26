import { Box, Heading, Link, HStack, Button } from "@chakra-ui/react";
import { useColorModeValue, useColorMode } from "@/components/ui/color-mode";
import { LuMoon, LuSun } from "react-icons/lu";

export function Header() {
  // Theme-aware colors
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const headerBorderColor = useColorModeValue("gray.200", "gray.700");
  const headingColor = useColorModeValue("gray.800", "white");
  const linkColor = useColorModeValue("gray.600", "gray.200");
  const linkHoverColor = useColorModeValue("gray.800", "white");
  const iconColor = useColorModeValue("gray.700", "white");
  
  // Theme toggle functionality
  const { colorMode, toggleColorMode } = useColorMode();
  const ThemeIcon = colorMode === "dark" ? LuMoon : LuSun;

  return (
    <Box as="header" bg={headerBg} borderBottom="1px" borderColor={headerBorderColor} p={4}>
      <HStack justify="space-between" align="center" maxW="1200px" mx="auto">
        <Heading size="lg" color={headingColor}>
          GitHub Issue Graph
        </Heading>
        <HStack gap={4}>
          <Button
            onClick={toggleColorMode}
            aria-label="Toggle color mode"
            size="sm"
            color={iconColor}
            p={0}
            minW="auto"
            h="auto"
            bg="transparent"
            border="none"
            _hover={{ bg: "transparent" }}
            _active={{ bg: "transparent" }}
            _focus={{ bg: "transparent", boxShadow: "none" }}
          >
            <ThemeIcon size={20} />
          </Button>
          <Link 
            href="https://github.com/vivekKodira/github-issue-graph" 
            target="_blank" 
            rel="noopener noreferrer"
            display="flex"
            alignItems="center"
            color={linkColor}
            _hover={{ color: linkHoverColor }}
            transition="color 0.2s"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              style={{ marginRight: "8px" }}
              color={iconColor}
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </Link>
        </HStack>
      </HStack>
    </Box>
  );
} 