import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import stopWords from "./stop_words";
import 'echarts-wordcloud';
import {
    Box,
    Input,
    Button,
    HStack,
    VStack,
    Table,
    ButtonGroup,
    Pagination,
    IconButton,
} from "@chakra-ui/react";

import { LuChevronLeft, LuChevronRight } from "react-icons/lu"

import { toaster } from "@/components/ui/toaster";

const DEFAULT_STOP_WORDS = new Set(stopWords.split(',').map(word => word.trim()));

const STORAGE_KEY = 'review-word-cloud-stop-words';

export const ReviewWordCloudChart = ({ prs, styleOptions }) => {
    const [chartOptions, setChartOptions] = useState(null);
    const [stopWords, setStopWords] = useState(() => {
        const savedWords = localStorage.getItem(STORAGE_KEY);
        return new Set(savedWords ? JSON.parse(savedWords) : Array.from(DEFAULT_STOP_WORDS));
    });
    const [newStopWord, setNewStopWord] = useState('');
    const [wordFrequencies, setWordFrequencies] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const saveStopWords = (words) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(words)));
    };

    const addStopWord = (word) => {
        if (word.trim()) {
            const updatedStopWords = new Set(stopWords);
            updatedStopWords.add(word);
            setStopWords(updatedStopWords);
            saveStopWords(updatedStopWords);
            processWordCloud(updatedStopWords);
            toaster.create({
                title: "Word added",
                description: `"${word}" added to stop words`,
                status: "success",
                duration: 2000,
            });
        }
    };

    const processWordCloud = (currentStopWords) => {
        if (!prs?.length) return;

        // Extract and count all words
        const wordCount = prs
            .flatMap(pr => pr.reviewComments)
            .flatMap(comment => {
                return comment.body
                    .toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(word => word.length > 2 && !/^\d+$/.test(word));
            })
            .reduce((acc, word) => {
                acc[word] = (acc[word] || 0) + 1;
                return acc;
            }, {});

        // Separate into displayed and filtered words
        const allWords = Object.entries(wordCount)
            .map(([word, count]) => ({ word, count, isFiltered: currentStopWords.has(word) }))
            .sort((a, b) => b.count - a.count);

        setWordFrequencies(allWords);

        // Create word cloud data from non-filtered words
        const wordCloudData = allWords
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
    };

    useEffect(() => {
        processWordCloud(stopWords);
    }, [prs]);

    // Calculate paginated data from visible words only
    const visibleWords = wordFrequencies.filter(item => !item.isFiltered);
    const paginatedData = visibleWords.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    return (
        <HStack spacing={4} align="stretch" w="full">
            {/* Word Cloud Chart */}
            <Box w="80%">
                {chartOptions && <ECharts option={chartOptions} style={styleOptions} />}
            </Box>

            {/* Word Management */}
            <Box borderWidth="1px" borderRadius="lg" w="20%">
                <HStack mb={4}>
                    <Input
                        placeholder="Add word to filter"
                        value={newStopWord}
                        onChange={(e) => setNewStopWord(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                addStopWord(newStopWord);
                            }
                        }}
                    />
                    <Button
                        onClick={() => addStopWord(newStopWord)}
                        colorScheme="blue"
                    >
                        Add
                    </Button>
                </HStack>

                <Table.Root variant="simple" w="full">
                    <Table.Header>
                        <Table.Row>
                            <Table.Cell fontWeight="bold">Word</Table.Cell>
                            <Table.Cell fontWeight="bold" textAlign="right">Frequency</Table.Cell>
                            <Table.Cell fontWeight="bold">Action</Table.Cell>
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
                                <Table.Cell>
                                    <Button
                                        onClick={() => addStopWord(word)}
                                        size="sm"
                                        colorScheme="blue"
                                        variant="ghost"
                                    >
                                        Filter
                                    </Button>
                                </Table.Cell>
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
                            render={({ value, isSelected }) => (
                                <IconButton 
                                    variant={isSelected ? "solid" : "ghost"}
                                    onClick={() => handlePageChange(value)}
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