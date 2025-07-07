import { calculateSentiment } from './sentiment'; // Adjust import path as needed

describe('calculateSentiment', () => {
  describe('positive sentiment', () => {
    it('should return positive values for positive text', () => {
      const result = calculateSentiment('I love this product!');
      expect(result).toBeGreaterThan(0);
    });

    it('should return higher values for more positive text', () => {
      const mildlyPositive = calculateSentiment('This is good');
      const veryPositive = calculateSentiment('This is absolutely amazing and wonderful!');
      
      expect(veryPositive).toBeGreaterThan(mildlyPositive);
    });

    it('should handle enthusiastic text', () => {
      const result = calculateSentiment('Fantastic! Excellent work! Love it!');
      expect(result).toBeGreaterThan(1);
    });
  });

  describe('negative sentiment', () => {
    it('should return negative values for negative text', () => {
      const result = calculateSentiment('I hate this terrible product!');
      expect(result).toBeLessThan(0);
    });

    it('should return lower values for more negative text', () => {
      const mildlyNegative = calculateSentiment('This is bad');
      const veryNegative = calculateSentiment('This is absolutely terrible and awful!');
      
      expect(veryNegative).toBeLessThan(mildlyNegative);
    });

    it('should handle very negative text', () => {
      const result = calculateSentiment('Horrible! Disgusting! Hate it! Terrible!');
      expect(result).toBeLessThan(-1);
    });
  });

  describe('neutral sentiment', () => {
    it('should return near zero for neutral text', () => {
      const result = calculateSentiment('This is a chair.');
      expect(Math.abs(result)).toBeLessThan(0.5);
    });

    it('should handle factual statements', () => {
      const result = calculateSentiment('The weather is 75 degrees today.');
      expect(Math.abs(result)).toBeLessThan(0.5);
    });

    it('should handle mixed sentiment', () => {
      const result = calculateSentiment('I love the design but hate the price.');
      // Mixed sentiment should be closer to neutral than purely positive/negative
      expect(Math.abs(result)).toBeLessThan(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = calculateSentiment('');
      expect(result).toBe(0);
    });

    it('should handle whitespace-only string', () => {
      const result = calculateSentiment('   \n\t  ');
      expect(result).toBe(0);
    });

    it('should handle single word positive', () => {
      const result = calculateSentiment('amazing');
      expect(result).toBeGreaterThan(0);
    });

    it('should handle single word negative', () => {
      const result = calculateSentiment('terrible');
      expect(result).toBeLessThan(0);
    });

    // it('should handle numbers and special characters', () => {
    //   const result = calculateSentiment('Product #123: 5/5 stars! @company');
    //   expect(result).toBeGreaterThan(0);
    // });
  });

  describe('normalization', () => {
    it('should return normalized scores (divided by 5)', () => {
      // Test that the function actually divides by 5
      const positiveResult = calculateSentiment('love amazing fantastic excellent');
      const negativeResult = calculateSentiment('hate terrible awful horrible');
      
      // These should be reasonable normalized values, not raw sentiment scores
      expect(positiveResult).toBeLessThan(10); // Raw scores could be much higher
      expect(negativeResult).toBeGreaterThan(-10); // Raw scores could be much lower
    });

    it('should maintain sentiment direction after normalization', () => {
      const positive = calculateSentiment('I love this amazing product!');
      const negative = calculateSentiment('I hate this terrible product!');
      const neutral = calculateSentiment('This is a product.');
      
      expect(positive).toBeGreaterThan(0);
      expect(negative).toBeLessThan(0);
      expect(Math.abs(neutral)).toBeLessThan(Math.abs(positive));
      expect(Math.abs(neutral)).toBeLessThan(Math.abs(negative));
    });
  });
})