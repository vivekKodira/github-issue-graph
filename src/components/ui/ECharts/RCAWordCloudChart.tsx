import { ECharts } from "./ECharts";
import { useState, useEffect, useCallback, useRef } from "react";
import 'echarts-wordcloud';
import {
    Box,
    Input,
    HStack,
    VStack,
    Table,
    ButtonGroup,
    Pagination,
    IconButton,
    Spinner,
    Center,
    Text,
} from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "./ErrorBoundary";
import { DateRangeFilterStrip } from "./DateRangeFilterStrip";
import { extractRCA, extractSentences, processSentencesWithAI } from '@/util/chartDataGenerators/textProcessing';

interface Issue {
    Type?: string;
    body?: string;
    title?: string;
    issue_number?: number;
    labels?: Array<{ name: string }>;
}

interface StyleOptions {
    width: string;
    height: string;
}

interface SentenceFrequency {
    sentence: string;
    count: number;
    isFiltered: boolean;
}

interface RCAWordCloudChartProps {
    issues: Issue[];
    styleOptions: StyleOptions;
    openaiApiKey?: string;
}

export const RCAWordCloudChart = ({ issues, styleOptions, openaiApiKey }: RCAWordCloudChartProps) => {
    const [chartOptions, setChartOptions] = useState(null);
    const [pieChartOptions, setPieChartOptions] = useState(null);
    const [newFilterSentence, setNewFilterSentence] = useState('');
    const [sentenceFrequencies, setSentenceFrequencies] = useState<SentenceFrequency[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [processedIssues, setProcessedIssues] = useState<string>('');
    const [lastOpenaiApiKey, setLastOpenaiApiKey] = useState<string>('');
    const processingRef = useRef(false);
    const pageSize = 10;
    const [dateFilteredData, setDateFilteredData] = useState<Issue[]>([]);

    const handleFilteredData = useCallback((filtered: unknown[]) => {
        setDateFilteredData(filtered as Issue[]);
    }, []);

    const dataToUse = dateFilteredData.length > 0 ? dateFilteredData : (issues ?? []);

    const processSentenceCloud = useCallback(async () => {
        if (!dataToUse?.length) return;

        if (processingRef.current) {
            console.log('Skipping - already processing');
            return;
        }

        // Create a unique identifier for the current state
        const issuesId = JSON.stringify({
            issues: dataToUse.filter(issue => {
                if (issue.Type?.toLowerCase() === 'bug') return true;
                if (issue.labels?.some(label => label.name?.toLowerCase() === 'bug')) return true;
                return false;
            }).map(i => i.body),
            apiKey: openaiApiKey
        });
        
        if (issuesId === processedIssues && openaiApiKey === lastOpenaiApiKey) {
            console.log('Skipping - already processed with same API key');
            return;
        }
        
        console.log('Starting RCA sentence processing');
        processingRef.current = true;
        setIsLoading(true);
        
        try {
            // Filter for Bug issues
            const bugIssues = dataToUse.filter(issue => {
                if (issue.Type?.toLowerCase() === 'bug') return true;
                if (issue.labels?.some(label => label.name?.toLowerCase() === 'bug')) return true;
                return false;
            });

            console.log('Bug issues found:', bugIssues.length);

            // Extract RCA sections and sentences
            const allSentences = bugIssues
                .map(issue => extractRCA(issue.body || ''))
                .filter(rca => rca !== null)
                .flatMap(rca => extractSentences(rca!));

            console.log('Total sentences extracted:', allSentences.length);

            // Process sentences with AI if API key is provided
            const { normalizedSentences, filteredSentences } = await processSentencesWithAI(allSentences, openaiApiKey || '');

            // Count sentence frequencies
            const sentenceCount = normalizedSentences.reduce((acc, sentence) => {
                acc[sentence] = (acc[sentence] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Create sentence frequency array - only include sentences that appear more than once
            const frequencies = Object.entries(sentenceCount)
                .filter(([_, count]) => count >= 2) // Only show repeating sentences
                .map(([sentence, count]) => ({
                    sentence,
                    count,
                    isFiltered: filteredSentences.includes(sentence)
                }))
                .sort((a, b) => b.count - a.count);

            setSentenceFrequencies(frequencies);
            setProcessedIssues(issuesId);
            setLastOpenaiApiKey(openaiApiKey || '');

            // Create word cloud data from non-filtered sentences
            const wordCloudData = frequencies
                .filter(item => !item.isFiltered)
                .map(item => {
                    // Truncate long sentences for display
                    const displayText = item.sentence.length > 50 
                        ? item.sentence.substring(0, 47) + '...'
                        : item.sentence;
                    return { name: displayText, value: item.count, fullText: item.sentence };
                })
                .slice(0, 50);

            const options = {
                title: {
                    text: 'RCA Sentence Patterns',
                    textStyle: {
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    show: true,
                    formatter: function (params: any) {
                        return `${params.data.fullText || params.name}\nCount: ${params.value}`;
                    }
                },
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    left: 'center',
                    top: 'center',
                    width: '70%',
                    height: '80%',
                    right: null,
                    bottom: null,
                    sizeRange: [14, 50],
                    rotationRange: [0, 0], // Keep text horizontal for readability
                    rotationStep: 45,
                    gridSize: 12,
                    drawOutOfBound: false,
                    textStyle: {
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        color: function () {
                            return 'rgb(' + [
                                Math.round(Math.random() * 160 + 50),
                                Math.round(Math.random() * 160 + 50),
                                Math.round(Math.random() * 160 + 50)
                            ].join(',') + ')';
                        }
                    },
                    emphasis: {
                        focus: 'self',
                        textStyle: {
                            shadowBlur: 10,
                            shadowColor: '#333'
                        }
                    },
                    data: wordCloudData
                }]
            };

            setChartOptions(options);

            // Top RCA patterns pie chart (top 10)
            const pieData = frequencies
                .filter(item => !item.isFiltered)
                .slice(0, 10)
                .map(item => ({
                    name: item.sentence.length > 40 ? item.sentence.substring(0, 37) + '...' : item.sentence,
                    value: item.count,
                    fullText: item.sentence
                }));
            const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
            setPieChartOptions(pieData.length ? {
                title: {
                    text: 'Top RCA Patterns',
                    textStyle: {
                        color: '#ffffff',
                        fontFamily: 'system-ui',
                        fontSize: 18,
                        textBorderWidth: 0,
                        textShadowBlur: 0
                    }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: (params: { data: { fullText?: string; value: number } }) =>
                        `${params.data.fullText ?? params.name}\nCount: ${params.data.value}`,
                    textStyle: { fontFamily: 'system-ui', fontSize: 13 }
                },
                legend: {
                    show: true,
                    type: 'scroll',
                    orient: 'vertical',
                    right: 10,
                    top: 'middle',
                    data: pieData.map(d => d.name),
                    formatter: (name: string) => {
                        const item = pieData.find(d => d.name === name);
                        const pct = item ? ((item.value / pieTotal) * 100).toFixed(1) : '0';
                        return `${name} (${pct}%)`;
                    },
                    textStyle: {
                        fontFamily: 'system-ui',
                        fontSize: 13,
                        color: '#e2e8f0',
                        textBorderWidth: 0,
                        textShadowBlur: 0
                    }
                },
                series: [{
                    type: 'pie',
                    radius: '60%',
                    center: ['40%', '50%'],
                    data: pieData,
                    label: { show: false },
                    labelLine: { show: false },
                    emphasis: {
                        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
                    }
                }]
            } : null);
        } catch (error) {
            console.error('Error in processSentenceCloud:', error);
            toaster.create({
                title: "Error processing sentences",
                description: "Failed to process RCA sentences. Please try again later.",
                duration: 5000,
            });
        } finally {
            processingRef.current = false;
            setIsLoading(false);
        }
    }, [dataToUse, openaiApiKey, processedIssues, lastOpenaiApiKey]);

    const mountedRef = useRef(false);
    const lastProcessedRef = useRef<string>('');

    useEffect(() => {
        if (!dataToUse?.length) return;

        const currentStateId = JSON.stringify({
            issues: dataToUse.filter(issue => {
                if (issue.Type?.toLowerCase() === 'bug') return true;
                if (issue.labels?.some(label => label.name?.toLowerCase() === 'bug')) return true;
                return false;
            }).map(i => i.body),
            apiKey: openaiApiKey
        });

        if (currentStateId === lastProcessedRef.current) {
            console.log('Skipping - already processed this exact state');
            return;
        }

        if (!mountedRef.current || currentStateId !== lastProcessedRef.current) {
            console.log('Processing RCA sentence cloud - state changed or initial mount');
            processSentenceCloud();
            lastProcessedRef.current = currentStateId;
        }

        mountedRef.current = true;
    }, [dataToUse, openaiApiKey]);

    const visibleSentences = sentenceFrequencies.filter(item => !item.isFiltered);
    const paginatedData = visibleSentences.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handlePageChange = (details: { page: number }) => {
        setCurrentPage(details.page);
    };

    const chartHeight = 500;
    return (
        <VStack align="stretch" w="full" gap={0}>
            {issues?.length ? (
                <Box flexShrink={0} width="100%" marginBottom={4}>
                    <DateRangeFilterStrip
                        data={issues as unknown as Record<string, unknown>[]}
                        dateField="createdAt"
                        onFilteredData={handleFilteredData as (filtered: Record<string, unknown>[]) => void}
                        styleOptions={styleOptions}
                    />
                </Box>
            ) : null}
            <HStack gap={4} align="stretch" w="full" flex={1} minHeight={0}>
            <Box w="80%" minWidth={0} height={`${chartHeight}px`} minHeight={`${chartHeight}px`} overflow="hidden" flexShrink={0}>
                {isLoading ? (
                    <Center h="100%">
                        <VStack>
                            <Spinner size="xl" />
                            <Text mt={4}>Processing RCA sentences{openaiApiKey ? ' with AI' : ''}...</Text>
                        </VStack>
                    </Center>
                ) : chartOptions ? (
                    <ErrorBoundary chartName="RCA Sentence Cloud">
                        <ECharts option={chartOptions} style={{ width: '100%', height: chartHeight }} />
                    </ErrorBoundary>
                ) : (
                    <Center h="100%">
                        <Text color="gray.500">
                            No repeating RCA sentences found in Bug issues.
                        </Text>
                    </Center>
                )}
            </Box>

            {!isLoading && chartOptions && (
                <Box borderWidth="1px" borderRadius="lg" w="20%" p={4}>
                    <VStack align="stretch" gap={4}>
                        <Text fontWeight="bold" fontSize="lg">
                            Top RCA Patterns
                        </Text>
                        
                        <Text fontSize="sm" color="gray.600">
                            Showing sentences that appear 2+ times
                        </Text>

                        <Table.Root size="sm" w="full">
                            <Table.Header>
                                <Table.Row>
                                    <Table.Cell fontWeight="bold">Sentence</Table.Cell>
                                    <Table.Cell fontWeight="bold" textAlign="right">Count</Table.Cell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {paginatedData.map(({ sentence, count }, index) => (
                                    <Table.Row 
                                        key={index}
                                        _hover={{ bg: "gray.50" }}
                                    >
                                        <Table.Cell 
                                            fontSize="xs"
                                            maxW="200px"
                                            overflow="hidden"
                                            textOverflow="ellipsis"
                                            title={sentence}
                                        >
                                            {sentence.length > 60 ? sentence.substring(0, 57) + '...' : sentence}
                                        </Table.Cell>
                                        <Table.Cell textAlign="right">{count}</Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>

                        {visibleSentences.length > pageSize && (
                            <Pagination.Root 
                                count={Math.ceil(visibleSentences.length / pageSize)} 
                                pageSize={pageSize} 
                                page={currentPage}
                                onPageChange={handlePageChange}
                            >
                                <ButtonGroup variant="ghost" size="sm" wrap="wrap">
                                    <Pagination.PrevTrigger asChild>
                                        <IconButton>
                                            <LuChevronLeft />
                                        </IconButton>
                                    </Pagination.PrevTrigger>

                                    <Pagination.Items
                                        render={({ value }) => (
                                            <IconButton 
                                                variant="ghost"
                                                onClick={() => handlePageChange({ page: value })}
                                            >
                                                {value}
                                            </IconButton>
                                        )}
                                    />

                                    <Pagination.NextTrigger asChild>
                                        <IconButton>
                                            <LuChevronRight />
                                        </IconButton>
                                    </Pagination.NextTrigger>
                                </ButtonGroup>
                            </Pagination.Root>
                        )}
                    </VStack>
                </Box>
            )}
        </HStack>
            {!isLoading && pieChartOptions && (
                <Box w="full" mt={4} height="420px" minHeight="420px">
                    <ErrorBoundary chartName="RCA Patterns Pie">
                        <ECharts option={pieChartOptions} style={{ width: '100%', height: 420 }} settings={{ notMerge: true }} />
                    </ErrorBoundary>
                </Box>
            )}
        </VStack>
    );
};
