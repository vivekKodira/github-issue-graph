import { extractRCA, extractSentences, processSentencesWithAI } from './textProcessing';

describe('extractRCA', () => {
  it('returns null for empty body', () => {
    expect(extractRCA('')).toBeNull();
    expect(extractRCA(null as any)).toBeNull();
    expect(extractRCA(undefined as any)).toBeNull();
  });

  it('extracts RCA section with ## heading', () => {
    const body = `
Some text before

## RCA
This is the root cause analysis
It spans multiple lines

## Another Section
Other content
    `;
    const result = extractRCA(body);
    expect(result).toBe('This is the root cause analysis\nIt spans multiple lines');
  });

  it('extracts RCA section with ### heading', () => {
    const body = `
### RCA
Root cause found here
    `;
    const result = extractRCA(body);
    expect(result).toBe('Root cause found here');
  });

  it('extracts RCA section with # heading', () => {
    const body = `
# RCA
Single hash heading
Another line
    `;
    const result = extractRCA(body);
    expect(result).toBe('Single hash heading\nAnother line');
  });

  it('extracts RCA section with **RCA** bold format', () => {
    const body = `
**RCA**
Bold format RCA section
    `;
    const result = extractRCA(body);
    expect(result).toBe('Bold format RCA section');
  });

  it('extracts RCA section with RCA: colon format', () => {
    const body = `
RCA:
Colon format analysis
Another line here
    `;
    const result = extractRCA(body);
    expect(result).toContain('Colon format analysis');
  });

  it('returns null when no RCA section found', () => {
    const body = `
# Some Other Section
No RCA here
    `;
    expect(extractRCA(body)).toBeNull();
  });

  it('handles case-insensitive matching', () => {
    const body = `
## rca
lowercase rca heading
    `;
    const result = extractRCA(body);
    expect(result).toBe('lowercase rca heading');
  });

  it('trims whitespace from extracted content', () => {
    const body = `
## RCA

   Content with extra whitespace

    `;
    const result = extractRCA(body);
    expect(result).toBe('Content with extra whitespace');
  });
});

describe('extractSentences', () => {
  it('returns empty array for empty text', () => {
    expect(extractSentences('')).toEqual([]);
    expect(extractSentences(null as any)).toEqual([]);
    expect(extractSentences(undefined as any)).toEqual([]);
  });

  it('splits text by sentence endings', () => {
    const text = 'First sentence. Second sentence! Third sentence?';
    const result = extractSentences(text);
    expect(result.length).toBe(3);
    expect(result[0]).toContain('first sentence');
    expect(result[1]).toContain('second sentence');
    expect(result[2]).toContain('third sentence');
  });

  it('splits text by newlines', () => {
    const text = `First line
Second line
Third line`;
    const result = extractSentences(text);
    expect(result.length).toBe(3);
  });

  it('filters out short sentences (less than 10 chars)', () => {
    const text = 'Short. This is a longer sentence that should be kept.';
    const result = extractSentences(text);
    expect(result.length).toBe(1);
    expect(result[0]).toContain('longer sentence');
  });

  it('removes markdown formatting', () => {
    const text = '**Bold text** and *italic text* with `code` formatting.';
    const result = extractSentences(text);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).not.toContain('**');
    expect(result[0]).not.toContain('*');
    expect(result[0]).not.toContain('`');
  });

  it('removes bullet points', () => {
    const text = `- First bullet point item
- Second bullet point item`;
    const result = extractSentences(text);
    expect(result.length).toBe(2);
    expect(result[0]).not.toMatch(/^-/);
    expect(result[0]).toContain('first bullet');
  });

  it('converts to lowercase', () => {
    const text = 'THIS IS UPPERCASE TEXT. Mixed Case Text.';
    const result = extractSentences(text);
    expect(result.every(s => s === s.toLowerCase())).toBe(true);
  });

  it('normalizes whitespace', () => {
    const text = 'Text   with    multiple     spaces.';
    const result = extractSentences(text);
    expect(result[0]).not.toMatch(/\s{2,}/);
  });

  it('trims sentences', () => {
    const text = '   Leading and trailing spaces   . Another sentence  .';
    const result = extractSentences(text);
    expect(result.every(s => s === s.trim())).toBe(true);
  });
});

describe('processSentencesWithAI', () => {
  it('returns original sentences when no API key provided', async () => {
    const sentences = ['sentence one', 'sentence two'];
    const result = await processSentencesWithAI(sentences, '');
    expect(result.normalizedSentences).toEqual(sentences);
    expect(result.filteredSentences).toEqual([]);
  });

  it('returns original sentences when API key is empty string', async () => {
    const sentences = ['test sentence'];
    const result = await processSentencesWithAI(sentences, '');
    expect(result.normalizedSentences).toEqual(sentences);
  });

  it('returns original sentences when no sentences appear twice', async () => {
    const sentences = ['unique one', 'unique two', 'unique three'];
    const result = await processSentencesWithAI(sentences, 'fake-key');
    expect(result.normalizedSentences).toEqual(sentences);
    expect(result.filteredSentences).toEqual([]);
  });

  it('handles fetch errors gracefully', async () => {
    // Mock fetch to fail
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

    const sentences = ['sentence', 'sentence'];
    const result = await processSentencesWithAI(sentences, 'test-key');

    expect(result.normalizedSentences).toEqual(sentences);
    expect(result.filteredSentences).toEqual([]);
  });

  it('handles non-ok response from API', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      statusText: 'Unauthorized'
    } as Response));

    const sentences = ['repeated', 'repeated'];
    const result = await processSentencesWithAI(sentences, 'bad-key');

    expect(result.normalizedSentences).toEqual(sentences);
  });

  it('handles invalid JSON response from API', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'invalid json here'
          }
        }]
      })
    } as Response));

    const sentences = ['repeated', 'repeated'];
    const result = await processSentencesWithAI(sentences, 'test-key');

    expect(result.normalizedSentences).toEqual(sentences);
  });

  it('handles missing response data structure', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    } as Response));

    const sentences = ['repeated', 'repeated'];
    const result = await processSentencesWithAI(sentences, 'test-key');

    expect(result.normalizedSentences).toEqual(sentences);
  });

  it('processes valid API response correctly', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify([
              { normalized: 'normalized sentence', count: 2 }
            ])
          }
        }]
      })
    } as Response));

    const sentences = ['sentence one', 'sentence one'];
    const result = await processSentencesWithAI(sentences, 'valid-key');

    expect(result.normalizedSentences).toEqual(['normalized sentence', 'normalized sentence']);
  });

  afterEach(() => {
    // Clean up fetch mock
    if (global.fetch && (global.fetch as jest.Mock).mockRestore) {
      (global.fetch as jest.Mock).mockRestore();
    }
  });
});
