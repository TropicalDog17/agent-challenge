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

interface ArticleSummary {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  insights: string[];
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

interface SummarizationRequest {
  category?: string;
  query?: string;
  pageSize?: number;
  country?: string;
}

interface SummarizationResponse {
  summaries: ArticleSummary[];
  timestamp: string;
  requestParams: SummarizationRequest;
}

export type {
  NewsArticle,
  ArticleSummary,
  NewsAPIResponse,
  SummarizationRequest,
  SummarizationResponse,
};
