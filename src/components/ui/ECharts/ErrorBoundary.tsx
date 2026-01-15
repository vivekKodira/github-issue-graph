import React, { Component, ReactNode } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  chartName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          p={4}
          border="1px solid"
          borderColor="red.300"
          borderRadius="md"
          bg="red.50"
          minH="200px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing={2}>
            <Text color="red.600" fontWeight="bold">
              {this.props.chartName ? `${this.props.chartName} Chart Error` : 'Chart Error'}
            </Text>
            <Text color="red.500" fontSize="sm" textAlign="center">
              Something went wrong while rendering this chart.
            </Text>
            <Text color="gray.500" fontSize="xs" textAlign="center">
              The error has been logged and won't affect other components.
            </Text>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}
