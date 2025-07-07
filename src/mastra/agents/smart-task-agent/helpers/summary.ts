
export async function generateSummary(description: string, content: string): Promise<string> {
    // Placeholder for summary generation logic
    // In a real implementation, this could call an LLM or summarization API
    return description ? description.slice(0, 100) + '...' : content.slice(0, 100) + '...';
}
