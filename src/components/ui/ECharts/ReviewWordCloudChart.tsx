import { ECharts } from "./ECharts";
import { useState, useEffect, useCallback, useRef } from "react";
import 'echarts-wordcloud';
import {
    Box,
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

interface ReviewComment {
    body: string;
}

interface PullRequest {
    reviewComments: ReviewComment[];
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

interface ReviewWordCloudChartProps {
    prs: PullRequest[];
    styleOptions: StyleOptions;
    openaiApiKey?: string;
}

// Function to extract sentences from text
function extractSentences(text: string): string[] {
    if (!text) return [];
    
    // Split by sentence endings (., !, ?) followed by space or newline
    // Also split by newlines to handle bullet points
    const sentences = text
        .split(/[.!?]\s+|\n+/)
        .map(s => s.trim())
        .filter(s => {
            // Remove markdown formatting
            const cleaned = s.replace(/[*_`#\-]/g, '').trim();
            // Filter out very short sentences (less than 10 chars) and empty ones
            return cleaned.length >= 10;
        })
        .map(s => {
            // Clean up the sentence: remove markdown, extra spaces, normalize
            return s
                .replace(/[*_`#]/g, '')
                .replace(/^\s*[-•]\s*/, '') // Remove bullet points
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
        });
    
    return sentences;
}

async function processSentencesWithAI(sentences: string[], openaiApiKey: string): Promise<{ normalizedSentences: string[]; filteredSentences: string[] }> {
    if (!openaiApiKey) {
        return { normalizedSentences: sentences, filteredSentences: [] };
    }

    try {
        // Count sentence frequencies
        const sentenceCount = sentences.reduce((acc, sentence) => {
            acc[sentence] = (acc[sentence] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sentenceData = Object.entries(sentenceCount)
            .map(([sentence, count]) => ({ sentence, count }))
            .filter(item => item.count >= 2) // Only process sentences that appear at least twice
            .sort((a, b) => b.count - a.count)
            .slice(0, 30); // Take top 30 repeating sentences for AI processing

        if (sentenceData.length === 0) {
            return { normalizedSentences: sentences, filteredSentences: [] };
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are analyzing code review comments. Group similar review comments together and provide a normalized representative sentence for each group. Your task: 1. Identify sentences describing the same feedback or review point 2. Group them together 3. Create a single normalized sentence for each group 4. Return the result as JSON array: [{"normalized": "...", "count": N}]'
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(sentenceData)
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from OpenAI API');
        }

        try {
            const processedData = JSON.parse(data.choices[0].message.content);
            
            // Convert back to sentence list format
            const normalizedSentences = processedData.flatMap((item: any) => 
                Array(item.count).fill(item.normalized)
            );

            return { 
                normalizedSentences, 
                filteredSentences: []
            };
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            return { normalizedSentences: sentences, filteredSentences: [] };
        }
    } catch (error) {
        console.error('Error processing sentences with AI:', error);
        return { normalizedSentences: sentences, filteredSentences: [] };
    }
}

export const ReviewWordCloudChart = ({ prs, styleOptions, openaiApiKey }: ReviewWordCloudChartProps) => {
    const [chartOptions, setChartOptions] = useState(null);
    const [sentenceFrequencies, setSentenceFrequencies] = useState<SentenceFrequency[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [processedPrs, setProcessedPrs] = useState<string>('');
    const [lastOpenaiApiKey, setLastOpenaiApiKey] = useState<string>('');
    const processingRef = useRef(false);
    const pageSize = 10;

    const processSentenceCloud = useCallback(async () => {
        if (!prs?.length) return;

        // Prevent concurrent processing
        if (processingRef.current) {
            console.log('Skipping - already processing');
            return;
        }

        // Create a unique identifier for the current PRs state and API key
        const prsId = JSON.stringify({
            prs: prs.map(pr => pr.reviewComments.map(c => c.body)),
            apiKey: openaiApiKey
        });
        
        // Skip if we've already processed these PRs with the same API key
        if (prsId === processedPrs && openaiApiKey === lastOpenaiApiKey) {
            console.log('Skipping - already processed with same API key');
            return;
        }
        
        console.log('Starting review sentence processing with PRs:', prs.length);
        processingRef.current = true;
        setIsLoading(true);
        
        try {
            // Extract all sentences from review comments
            const allSentences = prs
                .flatMap(pr => pr.reviewComments)
                .flatMap(comment => extractSentences(comment.body));

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
            setProcessedPrs(prsId);
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
                    text: 'Review Comments Sentence Patterns',
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
        } catch (error) {
            console.error('Error in processSentenceCloud:', error);
            toaster.create({
                title: "Error processing sentences",
                description: "Failed to process review sentences. Please try again later.",
                duration: 5000,
            });
        } finally {
            processingRef.current = false;
            setIsLoading(false);
        }
    }, [prs, openaiApiKey, processedPrs, lastOpenaiApiKey]);

    // Use a ref to track if we've mounted
    const mountedRef = useRef(false);
    const lastProcessedRef = useRef<string>('');

    useEffect(() => {
        if (!prs?.length) return;

        // Create a unique identifier for the current state
        const currentStateId = JSON.stringify({
            prs: prs.map(pr => pr.reviewComments.map(c => c.body)),
            apiKey: openaiApiKey
        });

        // Skip if we've already processed this exact state
        if (currentStateId === lastProcessedRef.current) {
            console.log('Skipping - already processed this exact state');
            return;
        }

        // Only process on mount or when state actually changes
        if (!mountedRef.current || currentStateId !== lastProcessedRef.current) {
            console.log('Processing review sentence cloud - state changed or initial mount');
            processSentenceCloud();
            lastProcessedRef.current = currentStateId;
        }

        mountedRef.current = true;
    }, [prs, openaiApiKey]);

    const visibleSentences = sentenceFrequencies.filter(item => !item.isFiltered);
    const paginatedData = visibleSentences.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handlePageChange = (details: { page: number }) => {
        setCurrentPage(details.page);
    };

    return (
        <HStack gap={4} align="stretch" w="full">
            <Box w="80%">
                {isLoading ? (
                    <Center h="500px">
                        <VStack>
                            <Spinner size="xl" />
                            <Text mt={4}>Processing review sentences{openaiApiKey ? ' with AI' : ''}...</Text>
                        </VStack>
                    </Center>
                ) : chartOptions ? (
                    <ErrorBoundary chartName="Review Sentence Cloud">
                        <ECharts option={chartOptions} style={styleOptions} />
                    </ErrorBoundary>
                ) : (
                    <Center h="500px">
                        <Text color="gray.500">
                            No repeating review sentences found.
                        </Text>
                    </Center>
                )}
            </Box>

            {!isLoading && chartOptions && (
                <Box borderWidth="1px" borderRadius="lg" w="20%" p={4}>
                    <VStack align="stretch" gap={4}>
                        <Text fontWeight="bold" fontSize="lg">
                            Top Review Patterns
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
    );
}; 