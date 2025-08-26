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
import stopWords from './stop_words';
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

interface WordFrequency {
    word: string;
    count: number;
    isFiltered: boolean;
}

interface ReviewWordCloudChartProps {
    prs: PullRequest[];
    styleOptions: StyleOptions;
    openaiApiKey?: string;
}

async function processWordsWithAI(words: string[], openaiApiKey: string): Promise<{ normalizedWords: string[]; filteredWords: string[] }> {
    // First use stop_words for initial filtering
    const stopWordsSet = new Set(stopWords.split(','));
    const filteredWords = words.filter(word => !stopWordsSet.has(word.toLowerCase()));
    
    if (!openaiApiKey) {
        return { normalizedWords: filteredWords, filteredWords: Array.from(stopWordsSet) as string[] };
    }

    try {
        // Create initial word cloud data
        const wordCount = filteredWords.reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const wordCloudData = Object.entries(wordCount)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50); // Take top 50 words for AI processing

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
                        content: 'You are a technical word processor analyzing code review comments. Given a list of words and their frequencies, your task is to: 1. Group similar technical terms (e.g., "debug", "debugging" -> "debug") 2. Normalize verb tenses to present tense (e.g., "fixed", "fixing" -> "fix") 3. Normalize plurals to singular form (e.g., "bugs", "bug" -> "bug") 4. Remove any remaining non-technical terms 5. Return the processed words in the same format. Each word should appear only once. Format: "word1:count1,word2:count2,..."'
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(wordCloudData)
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from OpenAI API');
        }

        // Parse the AI response
        try {
            const processedWords = data.choices[0].message.content
                .split(',')
                .map(item => {
                    const [word, count] = item.split(':');
                    return { word: word.trim(), count: parseInt(count, 10) };
                })
                .filter(item => !isNaN(item.count));

            // Convert back to word list format
            const normalizedWords = processedWords.flatMap(item => 
                Array(item.count).fill(item.word)
            );

            return { 
                normalizedWords, 
                filteredWords: Array.from(stopWordsSet) as string[] 
            };
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            return { normalizedWords: filteredWords, filteredWords: Array.from(stopWordsSet) as string[] };
        }
    } catch (error) {
        console.error('Error processing words with AI:', error);
        return { normalizedWords: filteredWords, filteredWords: Array.from(stopWordsSet) as string[] };
    }
}

export const ReviewWordCloudChart = ({ prs, styleOptions, openaiApiKey }: ReviewWordCloudChartProps) => {
    const [chartOptions, setChartOptions] = useState(null);
    const [newStopWord, setNewStopWord] = useState('');
    const [wordFrequencies, setWordFrequencies] = useState<WordFrequency[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [processedPrs, setProcessedPrs] = useState<string>('');
    const [lastOpenaiApiKey, setLastOpenaiApiKey] = useState<string>('');
    const processingRef = useRef(false);
    const pageSize = 10;

    const processWordCloud = useCallback(async () => {
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
        
        console.log('Starting processing with PRs:', prs.length);
        processingRef.current = true;
        setIsLoading(true);
        
        try {
            // Extract all words from review comments
            const allWords = prs
                .flatMap(pr => pr.reviewComments)
                .flatMap(comment => {
                    return comment.body
                        .toLowerCase()
                        .replace(/[^\w\s]/g, '')
                        .split(/\s+/)
                        .filter(word => word.length > 2 && !/^\d+$/.test(word));
                });

            console.log('Processing words with AI');
            // Process words with AI if API key is provided
            const { normalizedWords, filteredWords } = await processWordsWithAI(allWords, openaiApiKey);

            // Count word frequencies
            const wordCount = normalizedWords.reduce((acc, word) => {
                acc[word] = (acc[word] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Create word frequency array
            const frequencies = Object.entries(wordCount)
                .map(([word, count]) => ({
                    word,
                    count,
                    isFiltered: filteredWords.includes(word)
                }))
                .sort((a, b) => b.count - a.count);

            setWordFrequencies(frequencies);
            setProcessedPrs(prsId);
            setLastOpenaiApiKey(openaiApiKey || '');

            // Create word cloud data from non-filtered words
            const wordCloudData = frequencies
                .filter(item => !item.isFiltered)
                .map(item => ({ name: item.word, value: item.count }))
                .slice(0, 100);

            const options = {
                title: {
                    text: 'Review Comments Word Cloud',
                    textStyle: {
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    show: true,
                    formatter: function (params) {
                        return `${params.name}: ${params.value}`;
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
                    sizeRange: [12, 60],
                    rotationRange: [-90, 90],
                    rotationStep: 45,
                    gridSize: 8,
                    drawOutOfBound: false,
                    textStyle: {
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        color: function () {
                            return 'rgb(' + [
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160)
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
            console.error('Error in processWordCloud:', error);
            toaster.create({
                title: "Error processing words",
                description: "Failed to process words with AI. Please try again later.",
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
            console.log('Processing word cloud - state changed or initial mount');
            processWordCloud();
            lastProcessedRef.current = currentStateId;
        }

        mountedRef.current = true;
    }, [prs, openaiApiKey]); // Remove processWordCloud from dependencies

    const visibleWords = wordFrequencies.filter(item => !item.isFiltered);
    const paginatedData = visibleWords.slice(
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
                            <Text mt={4}>Processing words with AI...</Text>
                        </VStack>
                    </Center>
                ) : chartOptions ? (
                    <ErrorBoundary chartName="Review Word Cloud">
                        <ECharts option={chartOptions} style={styleOptions} />
                    </ErrorBoundary>
                ) : null}
            </Box>

            {!isLoading && chartOptions && (
                <Box borderWidth="1px" borderRadius="lg" w="20%">
                    <HStack mb={4}>
                        <Input
                            placeholder="Add word to filter"
                            value={newStopWord}
                            onChange={(e) => setNewStopWord(e.target.value)}
                        />
                    </HStack>

                    <Table.Root w="full">
                        <Table.Header>
                            <Table.Row>
                                <Table.Cell fontWeight="bold">Word</Table.Cell>
                                <Table.Cell fontWeight="bold" textAlign="right">Frequency</Table.Cell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {paginatedData.map(({ word, count }) => (
                                <Table.Row 
                                    key={word}
                                    _hover={{ bg: "gray.50" }}
                                >
                                    <Table.Cell>{word}</Table.Cell>
                                    <Table.Cell textAlign="right">{count}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>

                    <Pagination.Root 
                        count={Math.ceil(visibleWords.length / pageSize)} 
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
                </Box>
            )}
        </HStack>
    );
}; 