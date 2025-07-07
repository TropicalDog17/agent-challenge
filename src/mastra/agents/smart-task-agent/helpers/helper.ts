import { calculateSentiment } from "./sentiment";
import { generateSummary } from "./summary";

interface MarketSentiment {
  overall: number;
  byCategory: Record<string, number>;
  volatility: number;
}

interface EmergingTheme {
  theme: string;
  strength: number;
  relatedArticles: string[];
}

interface Opportunity {
  type: string;
  description: string;
  confidence: number;
  timeframe: string;
  actionItems: string[];
}

function findOpportunities(articles: AnalyzedArticle[]): Opportunity[] {
  const opportunities: Opportunity[] = [];
  
  articles.forEach(article => {
    if (article.sentiment > 0.3 && article.topics.includes('Business')) {
      opportunities.push({
        type: "Business Expansion",
        description: "Positive market sentiment indicates growth opportunities",
        confidence: article.sentiment,
        timeframe: "3-6 months",
        actionItems: [
          "Research market entry points",
          "Analyze competitor strategies",
          "Develop expansion plan"
        ]
      });
    }
    
    if (article.topics.includes('AI/Tech') && article.sentiment > 0.1) {
      opportunities.push({
        type: "Technology Adoption",
        description: "AI/Tech gaining positive traction in market",
        confidence: article.sentiment + 0.2,
        timeframe: "1-3 months",
        actionItems: [
          "Identify key AI technologies",
          "Assess implementation costs",
          "Plan pilot program"
        ]
      });
    }
    
    if (article.topics.includes('Crypto') || article.topics.includes('Blockchain')) {
      opportunities.push({
        type: "Blockchain Innovation",
        description: "Emerging blockchain opportunities detected",
        confidence: 0.7,
        timeframe: "1-2 months",
        actionItems: [
          "Review blockchain protocols",
          "Assess market demand",
          "Identify partnership opportunities"
        ]
      });
    }
  });
  
  return [...new Set(opportunities)];
}

function calculateReliability(article: any): number {
  let score = 0.5; // Base score
  
  // Trusted sources boost score
  const trustedSources = ['Reuters', 'Bloomberg', 'Associated Press', 'Financial Times'];
  if (trustedSources.includes(article.source.name)) score += 0.3;
  
  // Recent articles are more reliable
  const age = Date.now() - new Date(article.publishedAt).getTime();
  if (age < 24 * 60 * 60 * 1000) score += 0.1; // Last 24 hours
  
  // Articles with sources and references
  if (article.content?.includes('according to') || article.content?.includes('cited')) score += 0.1;
  
  return Math.min(score, 1); // Cap at 1.0
}

function calculateEngagement(article: any) {
  return {
    social: Math.random() * 100, // TODO: Implement real social metrics
    comments: Math.floor(Math.random() * 50),
    shares: Math.floor(Math.random() * 30)
  };
}

export async function analyzeNews(articles: any[]): Promise<any> {
  const analyzed: AnalyzedArticle[] = await Promise.all(articles.map(async article => ({
    title: article.title,
    summary: await generateSummary(article.description, article.content),
    source: article.source.name,
    url: article.url,
    publishedAt: new Date(article.publishedAt).toLocaleString(),
    sentiment: calculateSentiment(article.title + " " + article.description),
    topics: extractTopics(article.title + " " + article.description),
    insights: generateInsights(article.title, article.description),
    reliability: calculateReliability(article),
    engagement: calculateEngagement(article)
  })));

  const marketSentiment = calculateMarketSentiment(analyzed);
  const emergingThemes = findEmergingThemes(analyzed);

  return {
    articles: analyzed,
    trends: detectTrends(analyzed),
    keyInsights: generateKeyInsights(analyzed),
    opportunities: findOpportunities(analyzed),
    marketSentiment,
    emergingThemes
  };
}

function extractTopics(text: string): string[] {
  const topicKeywords = {
    'AI/Tech': ['ai', 'artificial intelligence', 'technology', 'software', 'digital', 'tech', 'machine learning', 'robotics'],
    'Finance': ['market', 'stock', 'investment', 'economy', 'financial', 'bank', 'trading'],
    'Crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'web3', 'token'],
    'Health': ['health', 'medical', 'vaccine', 'drug', 'disease', 'healthcare', 'biotech'],
    'Climate': ['climate', 'environment', 'renewable', 'carbon', 'energy', 'sustainable'],
    'Politics': ['government', 'policy', 'election', 'political', 'regulation', 'compliance'],
    'Business': ['company', 'business', 'corporate', 'merger', 'acquisition', 'CEO', 'startup'],
    'Blockchain': ['blockchain', 'smart contract', 'dao', 'decentralized', 'web3', 'protocol']
  };
  
  const found = [];
  const lower = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      found.push(topic);
    }
  }
  
  return found.length > 0 ? found : ['General'];
}

function generateInsights(title: string, description: string): string[] {
  const insights = [];
  const text = (title + " " + description).toLowerCase();
  
  // Pattern-based insights
  if (text.includes('merger') || text.includes('acquisition')) {
    insights.push("M&A activity - monitor for market consolidation");
  }
  
  if (text.includes('ipo') || text.includes('public')) {
    insights.push("IPO opportunity - research early investment potential");
  }
  
  if (text.includes('regulation') || text.includes('ban')) {
    insights.push("Regulatory change - assess compliance impact");
  }
  
  if (text.includes('breakthrough') || text.includes('innovation')) {
    insights.push("Innovation signal - evaluate competitive advantages");
  }
  
  if (text.includes('shortage') || text.includes('supply')) {
    insights.push("Supply chain impact - consider alternative strategies");
  }
  
  if (text.includes('earnings') || text.includes('revenue')) {
    insights.push("Financial performance indicator - track sector trends");
  }

  if (text.includes('blockchain') || text.includes('crypto')) {
    insights.push("Blockchain/crypto development - monitor for adoption opportunities");
  }
  
  return insights.length > 0 ? insights : ["Monitor for follow-up developments"];
}

function calculateMarketSentiment(articles: AnalyzedArticle[]): MarketSentiment {
  const byCategory: Record<string, number[]> = {};
  
  articles.forEach(article => {
    article.topics.forEach(topic => {
      if (!byCategory[topic]) byCategory[topic] = [];
      byCategory[topic].push(article.sentiment);
    });
  });

  const byCategoryAvg = Object.entries(byCategory).reduce((acc, [topic, sentiments]) => {
    acc[topic] = sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length;
    return acc;
  }, {} as Record<string, number>);

  const overall = Object.values(byCategoryAvg).reduce((sum, val) => sum + val, 0) / Object.keys(byCategoryAvg).length;
  
  const volatility = Math.sqrt(
    articles.map(a => a.sentiment)
      .reduce((sum, val) => sum + Math.pow(val - overall, 2), 0) / articles.length
  );

  return {
    overall,
    byCategory: byCategoryAvg,
    volatility
  };
}

function findEmergingThemes(articles: AnalyzedArticle[]): EmergingTheme[] {
  const themes = new Map<string, { count: number; articles: string[] }>();
  
  articles.forEach(article => {
    const text = article.title + " " + article.summary;
    
    // Look for emerging theme patterns
    const patterns = [
      { regex: /(?:new|emerging|rising|growing)\s+(?:trend|movement|wave|paradigm)/i, theme: "Emerging Trend" },
      { regex: /(?:breakthrough|innovation|discovery)/i, theme: "Innovation" },
      { regex: /(?:crisis|problem|challenge|issue)/i, theme: "Challenge" },
      { regex: /(?:opportunity|potential|promise)/i, theme: "Opportunity" },
      { regex: /(?:transformation|shift|change|evolution)/i, theme: "Transformation" }
    ];
    
    patterns.forEach(({ regex, theme }) => {
      if (regex.test(text)) {
        if (!themes.has(theme)) {
          themes.set(theme, { count: 0, articles: [] });
        }
        const themeData = themes.get(theme)!;
        themeData.count++;
        themeData.articles.push(article.title);
      }
    });
  });
  
  return Array.from(themes.entries())
    .map(([theme, data]) => ({
      theme,
      strength: data.count / articles.length,
      relatedArticles: data.articles
    }))
    .filter(theme => theme.strength > 0.1)
    .sort((a, b) => b.strength - a.strength);
}

function generateKeyInsights(articles: AnalyzedArticle[]): string[] {
  const insights: string[] = [];
  const avgSentiment = articles.reduce((sum, a) => sum + a.sentiment, 0) / articles.length;
  
  if (avgSentiment > 0.3) {
    insights.push("Market sentiment is notably positive - consider growth opportunities");
  } else if (avgSentiment < -0.3) {
    insights.push("Negative sentiment detected - focus on risk management");
  }
  
  const allTopics = articles.flatMap(a => a.topics);
  const topicCounts: Record<string, number> = allTopics.reduce((acc: Record<string, number>, topic: string) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});
  
  const dominantTopic = Object.entries(topicCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];
  
  if (dominantTopic && dominantTopic[1] > articles.length * 0.4) {
    insights.push(`${dominantTopic[0]} is dominating news cycle - expect continued focus`);
  }
  
  if (allTopics.includes('AI/Tech') && allTopics.includes('Finance')) {
    insights.push("Fintech convergence trend - AI adoption accelerating in financial sector");
  }

  if (allTopics.includes('Blockchain') || allTopics.includes('Crypto')) {
    insights.push("Blockchain/crypto developments - monitor for integration opportunities");
  }
  
  return insights;
}

function detectTrends(articles: AnalyzedArticle[]): any[] {
  const trends = [];
  const topicMentions = new Map<string, { count: number; sentiment: number; related: Set<string> }>();
  
  articles.forEach(article => {
    article.topics.forEach(topic => {
      if (!topicMentions.has(topic)) {
        topicMentions.set(topic, { count: 0, sentiment: 0, related: new Set() });
      }
      const data = topicMentions.get(topic)!;
      data.count++;
      data.sentiment += article.sentiment;
      
      // Find related topics
      article.topics
        .filter(t => t !== topic)
        .forEach(related => data.related.add(related));
    });
  });
  
  for (const [topic, data] of topicMentions.entries()) {
    const avgSentiment = data.sentiment / data.count;
    const strength = data.count / articles.length;
    
    trends.push({
      topic,
      momentum: avgSentiment > 0.2 ? "rising" : avgSentiment < -0.2 ? "falling" : "stable",
      strength,
      relatedTopics: Array.from(data.related),
      predictedTrend: predictTrend(avgSentiment, strength)
    });
  }
  
  return trends.sort((a, b) => b.strength - a.strength);
}

function predictTrend(sentiment: number, strength: number): string {
  if (sentiment > 0.3 && strength > 0.5) {
    return "Strong growth expected";
  } else if (sentiment > 0.1 && strength > 0.3) {
    return "Moderate growth likely";
  } else if (sentiment < -0.3 && strength > 0.5) {
    return "Significant decline possible";
  } else if (sentiment < -0.1 && strength > 0.3) {
    return "Moderate decline likely";
  } else {
    return "Stable trend expected";
  }
}

// Fallback mock data for demo purposes
export function getMockNewsData(context: any): MockNewsResponse {
  return {
    articles: [
      {
        title: "AI Breakthrough in Healthcare Diagnosis",
        summary: "New artificial intelligence system shows 95% accuracy in early disease detection.",
        source: "TechNews",
        url: "https://example.com/ai-healthcare",
        publishedAt: new Date().toLocaleString(),
        sentiment: 0.8,
        topics: ["AI/Tech", "Health"],
        insights: ["Innovation signal - evaluate competitive advantages"],
      },
      {
        title: "Market Rally Continues as Tech Stocks Surge",
        summary: "Technology sector leads market gains with strong earnings reports.",
        source: "Financial Times",
        url: "https://example.com/market-rally",
        publishedAt: new Date().toLocaleString(),
        sentiment: 0.6,
        topics: ["Finance", "AI/Tech"],
        insights: ["Financial performance indicator - track sector trends"],
      }
    ],
    trends: [
      {
        topic: "AI/Tech",
        momentum: "rising" as const,
        strength: 0.8,
      }
    ],
    keyInsights: [
      "Market sentiment is notably positive - consider growth opportunities",
      "AI/Tech is dominating news cycle - expect continued focus"
    ],
    opportunities: [
      "AI adoption opportunity - technology gaining traction",
      "Business expansion opportunity in positive market"
    ]
  };
}

