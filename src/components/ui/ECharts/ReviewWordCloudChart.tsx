import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import 'echarts-wordcloud';
import {
    Box,
    Input,
    HStack,
    Table,
    ButtonGroup,
    Pagination,
    IconButton,
} from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import stopWords from './stop_words';

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
    if (!openaiApiKey) {
        // If no API key, use basic stop words filtering
        const stopWordsSet = new Set(stopWords.split(','));
        const filteredWords = words.filter(word => !stopWordsSet.has(word.toLowerCase()));
        return { normalizedWords: filteredWords, filteredWords: Array.from(stopWordsSet) as string[] };
    }

    try {
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
                        content: 'You are a helpful assistant that processes words for a word cloud. Your task is to: 1. Remove common words (articles, prepositions, etc.) 2. Normalize words to their base form (e.g., "hardcoded" -> "hardcode", "running" -> "run"). Return a JSON object with two arrays: "normalizedWords" and "filteredWords".'
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(words)
                    }
                ],
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return result;
    } catch (error) {
        console.error('Error processing words with AI:', error);
        // Fallback to basic stop words filtering on error
        const stopWordsSet = new Set(stopWords.split(','));
        const filteredWords = words.filter(word => !stopWordsSet.has(word.toLowerCase()));
        return { normalizedWords: filteredWords, filteredWords: Array.from(stopWordsSet) as string[] };
    }
}

export const ReviewWordCloudChart = ({ prs, styleOptions, openaiApiKey }: ReviewWordCloudChartProps) => {
    const [chartOptions, setChartOptions] = useState(null);
    const [newStopWord, setNewStopWord] = useState('');
    const [wordFrequencies, setWordFrequencies] = useState<WordFrequency[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const processWordCloud = async () => {
        if (!prs?.length) return;

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
        } catch {
            toaster.create({
                title: "Error processing words",
                description: "Failed to process words with AI. Please try again later.",
                duration: 5000,
            });
        }
    };

    useEffect(() => {
        processWordCloud();
    }, [prs]);

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
                {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
            </Box>

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
        </HStack>
    );
}; 