export async function searchFashion(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('Missing TAVILY_API_KEY');

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 4,
      include_answer: true,
    }),
  });

  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = await res.json();

  // Return the AI-generated answer if available, otherwise top result snippets
  if (data.answer) return data.answer;

  return (data.results ?? [])
    .slice(0, 3)
    .map((r: any) => `${r.title}: ${r.content}`)
    .join('\n\n');
}
