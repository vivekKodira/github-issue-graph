// Function to extract RCA section from issue body
export function extractRCA(body: string): string | null {
    if (!body) return null;

    const rcaPatterns = [
        /##\s*RCA\s*\n([\s\S]*?)(?=\n##|$)/i,
        /###\s*RCA\s*\n([\s\S]*?)(?=\n###|$)/i,
        /#\s*RCA\s*\n([\s\S]*?)(?=\n#|$)/i,
        /\*\*RCA\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/i,
        /RCA:\s*\n([\s\S]*?)(?=\n[A-Z][a-z]+:|$)/i,
    ];

    for (const pattern of rcaPatterns) {
        const match = body.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return null;
}

// Function to extract sentences from text
export function extractSentences(text: string): string[] {
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

export async function processSentencesWithAI(sentences: string[], openaiApiKey: string): Promise<{ normalizedSentences: string[]; filteredSentences: string[] }> {
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
                        content: 'You are analyzing Root Cause Analysis (RCA) statements from bug reports. Group similar RCA statements together and provide a normalized representative sentence for each group. Your task: 1. Identify sentences describing the same root cause 2. Group them together 3. Create a single normalized sentence for each group 4. Return the result as JSON array: [{"normalized": "...", "count": N}]'
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
