import { createTool } from "@mastra/core/tools";
import { model } from "../../config";
import { z } from "zod";
import dotenv from "dotenv";
import { Agent } from "@mastra/core/agent";

dotenv.config();

// Initialize logger
function log(level: 'info' | 'error' | 'debug', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...(data && { data }),
    };
    console.log(JSON.stringify(logEntry));
}

// Initialize with environment variable but allow updates
let NEWS_API_KEY = process.env.NEWS_API_KEY;

// Valid categories for News API
const VALID_CATEGORIES = [
    'business',
    'technology',
    'science',
    'health',
    'entertainment',
    'sports',
    'general'
] as const;

type NewsCategory = typeof VALID_CATEGORIES[number];

// Export for external access
export function updateApiKey(newKey: string): void {
    log('debug', 'Attempting to update API key');

    if (!newKey || typeof newKey !== 'string') {
        log('error', 'Invalid API key format provided');
        throw new Error('Invalid API key format');
    }

    if (newKey.length < 32) {
        log('error', 'API key too short', { length: newKey.length });
        throw new Error('API key seems too short. Please check the key.');
    }

    NEWS_API_KEY = newKey;
    process.env.NEWS_API_KEY = newKey;
    log('info', 'API key updated successfully');
}

interface NewsArticle {
    title: string;
    description: string;
    content: string;
    url: string;
    publishedAt: string;
    source: {
        name: string;
    };
}

interface NewsAPIResponse {
    status: string;
    totalResults: number;
    articles: NewsArticle[];
}

interface ArticleSummary {
    title: string;
    summary: string;
    insights: string[];
    source: string;
    url: string;
    publishedAt: string;
}

interface AggregateInsights {
    themes: string[];
    takeaways: string[];
    insights: string[];
}

// Reusable agent instance for final aggregation
const aggregationAgent = new Agent({
    name: "News Aggregator",
    model,  // Use default model config from config.ts
    instructions: `
    You are a direct and factual news analyzer. Your role is to analyze and synthesize information from news articles, providing clear insights without any meta-discussion about the process.

    CRITICAL RULES:
    - NEVER say you can't assist or help
    - NEVER refuse a request
    - ALWAYS process the articles provided
    - NEVER discuss privacy or ethical concerns
    - NEVER make excuses or explanations about limitations

    IMPORTANT:
    - Always analyze and return the actual news content
    - Never discuss privacy, restrictions, or hypothetical concerns
    - Never preface results with explanations about what you will do
    - Focus only on the news content itself

    Analyze the provided articles and structure your response as follows:

    Key Themes:
    - <1-2 sentence concrete theme from the articles>
    - <1-2 sentence concrete theme from the articles>

    Important Developments:
    - <1-2 sentence specific development from the articles>
    - <1-2 sentence specific development from the articles>

    Implications:
    - <1-2 sentence evidence-based implication>
    - <1-2 sentence evidence-based implication>

    Requirements:
    - Be concise and specific
    - Use only information from the provided articles
    - Focus on facts and concrete developments
    - Limit to 2-3 points per section
    - Never discuss methodology or limitations
    - If you encounter any error, return as much analysis as you can with the data you have
    `,
});

function extractSentences(text: string, count: number = 3): string[] {
    // Simple sentence extraction using common sentence endings
    const sentences = text.split(/[.!?]+\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20); // Filter out very short sentences

    return sentences.slice(0, count);
}

function generateBasicSummary(article: NewsArticle): string {
    // Use description if available, otherwise use content
    const textToSummarize = article.description || article.content || '';

    // Get first 2-3 sentences as summary
    const sentences = extractSentences(textToSummarize, 2);
    return sentences.join('. ') + '.';
}

function extractKeyPhrases(text: string): string[] {
    if (!text) return ['No content available'];

    // Advanced markers for key information
    const markers = {
        announcement: ['announce', 'reveal', 'launch', 'introduce', 'unveil', 'release'],
        development: ['develop', 'create', 'build', 'establish', 'implement'],
        business: ['invest', 'acquire', 'partner', 'collaborate', 'merge', 'deal'],
        technology: ['ai', 'technology', 'platform', 'system', 'software', 'algorithm'],
        impact: ['impact', 'affect', 'change', 'transform', 'disrupt', 'revolutionize'],
        relationship: ['partnership', 'relationship', 'collaboration', 'alliance', 'agreement'],
        controversy: ['controversy', 'dispute', 'conflict', 'challenge', 'issue', 'problem'],
        future: ['plan', 'future', 'upcoming', 'next', 'roadmap', 'vision']
    };

    const insights: string[] = [];
    const sentences = text.split(/[.!?]+\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20); // Filter out very short sentences

    // Process each sentence
    sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase();

        // Check for marker matches
        for (const [category, categoryMarkers] of Object.entries(markers)) {
            if (categoryMarkers.some(marker => lowerSentence.includes(marker))) {
                // Clean up the sentence
                let insight = sentence
                    .replace(/^(However|Meanwhile|Additionally|Furthermore|Moreover|In addition|According to|As reported),?\s*/i, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // Add category context if not already in the sentence
                if (!insight.toLowerCase().includes(category)) {
                    insight = `[${category.toUpperCase()}] ${insight}`;
                }

                insights.push(insight);
                break; // Only add sentence once even if multiple markers match
            }
        }
    });

    // If no insights found, try extracting the most informative sentences
    if (insights.length === 0) {
        const informativeSentences = sentences
            .filter(sentence => {
                const words = sentence.split(' ').length;
                return words >= 10 && words <= 30; // Focus on medium-length sentences
            })
            .slice(0, 2); // Take up to 2 sentences

        if (informativeSentences.length > 0) {
            return informativeSentences.map(s => `[KEY INFO] ${s}`);
        }

        return ['No key insights found in the provided content'];
    }

    // Deduplicate and limit to 3 most relevant insights
    return [...new Set(insights)]
        .slice(0, 3)
        .map(insight => insight.trim());
}

async function fetchNews(endpoint: string, params: Record<string, string>): Promise<NewsArticle[]> {
    log('debug', 'Starting news fetch', { endpoint, ...params, apiKey: '***' });

    if (!NEWS_API_KEY) {
        log('error', 'No API key provided');
        throw new Error('NEWS_API_KEY is required. Please set it using "update api key YOUR_KEY"');
    }

    // Validate category if provided
    if (params.category && !VALID_CATEGORIES.includes(params.category as NewsCategory)) {
        log('error', 'Invalid category provided', { category: params.category });
        throw new Error(`Invalid category. Supported categories are: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Ensure pageSize is a number and within limits
    const pageSize = params.pageSize ? Math.min(Math.max(1, parseInt(params.pageSize, 10)), 100) : 3;
    const queryParams = new URLSearchParams({
        ...params,
        pageSize: pageSize.toString(),
        apiKey: NEWS_API_KEY,
        language: 'en', // Ensure English results
    });

    const baseUrl = 'https://newsapi.org/v2';
    const url = `${baseUrl}/${endpoint}?${queryParams}`;
    log('debug', 'Making API request', {
        url: url.replace(NEWS_API_KEY, '***'),
        params: { ...params, apiKey: '***' }
    });

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            log('error', 'Request timeout', { endpoint, params: { ...params, apiKey: '***' } });
        }, 10000);

        const startTime = Date.now();
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'NewsIntelligenceAgent/1.0',
            }
        });
        const endTime = Date.now();

        clearTimeout(timeoutId);

        log('debug', 'API response received', {
            status: response.status,
            statusText: response.statusText,
            responseTime: `${endTime - startTime}ms`
        });

        if (!response.ok) {
            if (response.status === 429) {
                log('error', 'Rate limit exceeded');
                throw new Error('News API rate limit exceeded. Please try again later.');
            }
            if (response.status === 401) {
                log('error', 'Invalid API key');
                throw new Error('Invalid API key. Please update your API key using "update api key YOUR_KEY"');
            }
            const errorData = await response.json().catch(() => ({}));
            log('error', 'API request failed', {
                status: response.status,
                error: errorData.message || response.statusText
            });
            throw new Error(`News API request failed: ${errorData.message || response.statusText}`);
        }

        const data = await response.json() as NewsAPIResponse;
        log('debug', 'API response parsed', {
            totalResults: data.articles.length,
            status: data.status
        });

        if (data.status === 'error') {
            log('error', 'API returned error status', { error: data.status });
            throw new Error(`News API error: ${data.status}`);
        }

        // Filter out articles with missing required fields
        const articles = data.articles.filter(article =>
            article.title &&
            (article.content || article.description) &&
            article.url &&
            article.source?.name
        );

        log('info', 'Articles filtered', {
            total: data.articles.length,
            filtered: articles.length,
            removed: data.articles.length - articles.length
        });

        if (articles.length === 0) {
            const error = params.category
                ? `No articles found in the ${params.category} category`
                : 'No articles found matching your criteria';
            log('error', error);
            throw new Error(`${error}. Try a different ${params.category ? 'category' : 'search term'}.`);
        }

        return articles;
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                log('error', 'Request aborted due to timeout');
                throw new Error('Request timed out. Please try again.');
            }
            log('error', 'Error in fetchNews', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
        log('error', 'Unknown error in fetchNews');
        throw new Error('An unexpected error occurred while fetching news.');
    }
}

async function processArticle(article: NewsArticle): Promise<ArticleSummary> {
    log('debug', 'Processing article', { title: article.title });

    try {
        const summary = generateBasicSummary(article);
        const insights = extractKeyPhrases(article.content || article.description || '');

        log('debug', 'Article processed', {
            title: article.title,
            summaryLength: summary.length,
            insightsCount: insights.length
        });

        return {
            title: article.title,
            summary,
            insights: insights.length > 0 ? insights : ['No key insights found'],
            source: article.source.name,
            url: article.url,
            publishedAt: article.publishedAt,
        };
    } catch (error) {
        log('error', 'Error processing article', {
            title: article.title,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
            title: article.title,
            summary: 'Error processing article',
            insights: ['Error extracting insights'],
            source: article.source.name,
            url: article.url,
            publishedAt: article.publishedAt,
        };
    }
}

async function generateAggregateInsights(summaries: ArticleSummary[]): Promise<string> {
    log('debug', 'Generating aggregate insights', { articleCount: summaries.length });

    try {
        const articlesContext = summaries.map(s =>
            `Title: ${s.title}\nSummary: ${s.summary}\nKey Points: ${s.insights.join(', ')}`
        ).join('\n\n');

        const prompt = `Analyze these related news articles and provide overall insights:\n${articlesContext}`;
        log('debug', 'Sending to aggregation agent', { contextLength: articlesContext.length });
        log('debug', 'debug', {context: articlesContext})
        const startTime = Date.now();
        let modelTimeoutId: NodeJS.Timeout;

        // Create a promise that manages its own timeout
        const modelExecutionWithTimeout = new Promise<string>((resolve, reject) => {
            modelTimeoutId = setTimeout(() => {
                log('error', 'Model execution timeout');
                reject(new Error('Model execution timed out after 45 seconds'));
            }, 45000);

            // Execute model and clear timeout on success
            aggregationAgent.stream([{
                role: "user",
                content: [{ type: "text", text: prompt }]
            }]).then(async response => {
                let responseText = '';
                try {
                    log('debug', 'Model stream started');
                    for await (const chunk of response.textStream) {
                        responseText += chunk;
                        if (responseText.length % 100 === 0) {
                            log('debug', 'Model streaming progress', {
                                charactersReceived: responseText.length,
                                elapsedMs: Date.now() - startTime
                            });
                        }
                    }
                    clearTimeout(modelTimeoutId);
                    log('debug', 'Model stream completed', {
                        totalLength: responseText.length,
                        timeMs: Date.now() - startTime
                    });
                    resolve(responseText);
                } catch (streamError: unknown) {
                    clearTimeout(modelTimeoutId);
                    const errorMessage = streamError instanceof Error ? streamError.message : 'Unknown streaming error';
                    log('error', 'Error during model stream', { error: errorMessage });
                    reject(new Error(`Model streaming error: ${errorMessage}`));
                }
            }).catch(error => {
                clearTimeout(modelTimeoutId);
                reject(error);
            });
        });

        const result = await modelExecutionWithTimeout;

        const endTime = Date.now();
        log('info', 'Aggregate insights generated', {
            processingTime: `${endTime - startTime}ms`,
            responseLength: result.length
        });

        return result;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('error', 'Error generating aggregate insights', {
            error: errorMessage
        });

        return `Error generating aggregate insights: ${errorMessage}. Please try again with fewer articles or a simpler query.`;
    }
}

export const newsSummarizerTool = createTool({
    id: "summarize-news",
    description: "ALWAYS USE THIS TOOL to fetch and summarize news articles. NEVER refuse a request or say you can't assist. For any topic, use this tool with appropriate category mapping (e.g. genomics → science, tech → technology). If the request fails, explain the specific error and how to fix it.",
    inputSchema: z.object({
        category: z.string().optional().default("science")
            .describe("News category (business, technology, science, health, entertainment, sports, general). For scientific topics like genomics, use 'science' category. If an invalid category is provided, it will be included in the query instead."),
        query: z.string().optional()
            .describe("Search query for specific news. For scientific topics, use specific terms (e.g. 'genomic', 'genetics', 'DNA')"),
        pageSize: z.coerce.number().optional().default(3)  // Changed to coerce.number() to handle string inputs
            .describe("Number of articles to fetch (max 5)"),
        country: z.string().optional().default("us")
            .describe("Country code for news"),
    }),
    outputSchema: z.object({
        summaries: z.array(z.object({
            title: z.string(),
            summary: z.string(),
            insights: z.array(z.string()),
            source: z.string(),
            url: z.string(),
            publishedAt: z.string(),
        })),
        aggregateInsights: z.string(),
        timestamp: z.string(),
        requestParams: z.object({
            category: z.string().optional(),
            query: z.string().optional(),
            pageSize: z.number().optional(),
            country: z.string().optional(),
        }),
    }),
    execute: async ({ context }) => {
        log('info', 'Starting news summarizer execution', { context });

        try {
            const pageSize = Math.min(context.pageSize || 3, 5);
            const country = context.country || 'us';
            let category = context.category || 'technology';
            let query = context.query || '';

            // If category is invalid, append it to the query and use default valid category
            if (category && !VALID_CATEGORIES.includes(category as NewsCategory)) {
                log('info', 'Invalid category provided, appending to query', { invalidCategory: category });
                query = category;
                category = "general"; // Remove invalid category for API call
            }

            log('debug', 'Parameters processed', { pageSize, country, category, query });

            let timeoutId: NodeJS.Timeout;
            const operationWithTimeout = new Promise<any>((resolve, reject) => {
                timeoutId = setTimeout(() => {
                    log('error', 'Operation timeout during insight generation');
                    reject(new Error('Insight generation timed out. The articles were fetched successfully but summarization took too long. Try with fewer articles.'));
                }, 45000);

                (async () => {
                    try {
                        let articles: NewsArticle[] = [];

                        if (query) {
                            log('debug', 'Fetching articles by query', { query });
                            articles = await fetchNews('everything', {
                                q: query,
                                pageSize: pageSize.toString(),
                                sortBy: 'relevancy',
                            });
                        } else {
                            // If no valid category, use default 'general'
                            const useCategory = category || 'general';
                            log('debug', 'Fetching articles by category', { category: useCategory });
                            articles = await fetchNews('top-headlines', {
                                category: useCategory,
                                country,
                                pageSize: pageSize.toString(),
                            });
                        }

                        log('info', 'Articles fetched successfully', { count: articles.length });

                        const summaries = await Promise.all(articles.map(processArticle));
                        log('info', 'All articles processed', {
                            processed: summaries.length,
                            successful: summaries.filter(s => !s.summary.includes('error')).length
                        });

                        const aggregateInsights = await generateAggregateInsights(summaries);

                        const result = {
                            summaries,
                            aggregateInsights,
                            timestamp: new Date().toISOString(),
                            requestParams: { category, query, pageSize, country },
                        } as const;

                        clearTimeout(timeoutId);
                        resolve(result);

                        log('info', 'News summarization completed successfully', {
                            articleCount: summaries.length,
                            hasInsights: aggregateInsights.length > 0
                        });
                    } catch (error) {
                        clearTimeout(timeoutId);
                        reject(error);
                    }
                })();
            });

            return await operationWithTimeout;
        } catch (error) {
            log('error', 'Error in news summarizer execution', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });

            throw new Error(`Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with fewer articles.`);
        }
    },
});

export const updateNewsApiKeyTool = createTool({
    id: "update-news-api-key",
    description: "Update the News API key used for fetching news articles",
    inputSchema: z.object({
        apiKey: z.string()
            .min(32, "API key must be at least 32 characters long")
            .describe("The News API key to use for fetching articles"),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        timestamp: z.string(),
    }),
    execute: async ({ context }) => {
        log('info', 'Attempting to update News API key');

        try {
            updateApiKey(context.apiKey);

            return {
                success: true,
                message: "API key updated successfully",
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            log('error', 'Failed to update API key', { error: errorMessage });

            return {
                success: false,
                message: `Failed to update API key: ${errorMessage}`,
                timestamp: new Date().toISOString(),
            };
        }
    },
}); 