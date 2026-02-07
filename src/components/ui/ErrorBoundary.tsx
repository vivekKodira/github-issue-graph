import React, { Component, ReactNode } from 'react';
import { Box, Text, Button } from '@chakra-ui/react';

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
          borderColor="red.200"
          borderRadius="md"
          bg="red.50"
          textAlign="center"
        >
          <Text color="red.600" fontWeight="bold" mb={2}>
            {this.props.chartName ? `${this.props.chartName} Chart Error` : 'Chart Error'}
          </Text>
          <Text color="red.500" fontSize="sm" mb={3}>
            Something went wrong while rendering this chart.
          </Text>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
} 