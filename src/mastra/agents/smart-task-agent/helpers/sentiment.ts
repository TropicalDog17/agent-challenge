import Sentiment from "sentiment"


// This function calculates sentiment for a given text using the Sentiment library
// It returns a sentiment score, where positive values indicate positive sentiment,
// Normalized to a range of -1 to 1 for easier interpretation
export function calculateSentiment(text: string): number {
let sentiment = new Sentiment();
  const cleanText = text
    .replace(/[#@]/g, ' ')  // Replace special chars with spaces
    .replace(/\d+/g, '')    // Remove numbers
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .trim();
let result = sentiment.analyze(cleanText);
return result.score / 5;
}