
export async function fetchNews(query?: string, category?: string, limit: number = 5) {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    throw new Error("NEWS_API_KEY not found - using fallback data");
  }

  let url = "https://newsapi.org/v2/";
  const params = new URLSearchParams();
  
  if (query) {
    url += "everything";
    params.append("q", query);
    params.append("sortBy", "publishedAt");
  } else {
    url += "top-headlines";
    if (category) params.append("category", category);
    params.append("country", "us");
  }
  
  params.append("apiKey", apiKey);
  params.append("pageSize", limit.toString());
  params.append("language", "en");

  const response = await fetch(`${url}?${params}`);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = (await response.json()) as NewsResponse;
  return data.articles.filter(a => a.title && a.description);
}