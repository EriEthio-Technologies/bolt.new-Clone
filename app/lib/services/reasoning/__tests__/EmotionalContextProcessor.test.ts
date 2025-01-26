import { EmotionalContextProcessor } from '../EmotionalContextProcessor';
import { VersioningMonitor } from '../../monitoring/VersioningMonitor';
import type { 
  EmotionalContext,
  EmotionalState,
  EmotionalSignal 
} from '~/types/emotional';

jest.mock('../../monitoring/VersioningMonitor');

describe('EmotionalContextProcessor', () => {
  let processor: EmotionalContextProcessor;
  let mockMonitor: jest.Mocked<VersioningMonitor>;

  const mockContext: EmotionalContext = {
    history: [
      {
        primary: 'joy',
        intensity: 0.8,
        confidence: 0.9,
        dimensions: {
          valence: 0.8,
          arousal: 0.7,
          dominance: 0.6
        }
      }
    ],
    situation: {
      type: 'conversation',
      intensity: 0.5,
      valence: 0.6
    }
  };

  beforeEach(() => {
    mockMonitor = {
      trackEmotionalAnalysis: jest.fn().mockResolvedValue(undefined)
    } as any;

    processor = new EmotionalContextProcessor(mockMonitor);
  });

  describe('processEmotionalContext', () => {
    it('should process emotional context successfully', async () => {
      const input = "I'm really excited about this project!";
      const result = await processor.processEmotionalContext(input, mockContext);

      expect(result).toMatchObject({
        state: expect.objectContaining({
          primary: expect.any(String),
          intensity: expect.any(Number),
          confidence: expect.any(Number),
          dimensions: expect.objectContaining({
            valence: expect.any(Number),
            arousal: expect.any(Number),
            dominance: expect.any(Number)
          })
        }),
        timestamp: expect.any(Date),
        metadata: expect.objectContaining({
          inputLength: input.length,
          confidenceScore: expect.any(Number),
          version: expect.any(String)
        }),
        insights: expect.any(Array),
        recommendations: expect.any(Array)
      });

      expect(mockMonitor.trackEmotionalAnalysis).toHaveBeenCalledWith(result);
    });

    it('should handle empty input gracefully', async () => {
      const result = await processor.processEmotionalContext('', mockContext);
      expect(result.state.confidence).toBeLessThan(0.5);
    });

    it('should handle missing context gracefully', async () => {
      const result = await processor.processEmotionalContext(
        'Test input',
        { history: [] }
      );
      expect(result.state.intensity).toBeLessThan(0.5);
    });
  });

  describe('signal extraction', () => {
    it('should extract lexical emotional signals', async () => {
      const input = "I'm feeling very happy and excited!";
      const result = await processor.processEmotionalContext(input, mockContext);

      expect(result.state.dimensions.valence).toBeGreaterThan(0);
      expect(result.state.dimensions.arousal).toBeGreaterThan(0);
    });

    it('should extract syntactic emotional signals', async () => {
      const input = "How could you do this to me?!";
      const result = await processor.processEmotionalContext(input, mockContext);

      expect(result.state.dimensions.dominance).toBeLessThan(0);
    });

    it('should combine multiple signal types', async () => {
      const input = "I'm really happy but also a bit nervous...";
      const result = await processor.processEmotionalContext(input, mockContext);

      expect(result.state.secondary).toBeDefined();
      expect(result.state.secondary!.length).toBeGreaterThan(1);
    });
  });

  describe('contextual processing', () => {
    it('should apply historical context', async () => {
      const historicalContext: EmotionalContext = {
        history: Array(5).fill({
          primary: 'anger',
          intensity: 0.8,
          confidence: 0.9,
          dimensions: {
            valence: -0.8,
            arousal: 0.9,
            dominance: 0.7
          }
        })
      };

      const result = await processor.processEmotionalContext(
        "I'm fine.",
        historicalContext
      );

      expect(result.state.dimensions.valence).toBeLessThan(0);
      expect(result.insights).toContain(
        expect.stringContaining('historical pattern')
      );
    });

    it('should apply situational modifiers', async () => {
      const situationalContext: EmotionalContext = {
        history: [],
        situation: {
          type: 'crisis',
          intensity: 0.9,
          valence: -0.8
        }
      };

      const result = await processor.processEmotionalContext(
        "Everything is okay",
        situationalContext
      );

      expect(result.state.intensity).toBeGreaterThan(0.7);
      expect(result.recommendations).toContain(
        expect.stringContaining('high-stress situation')
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid input gracefully', async () => {
      const input = null as any;
      await expect(
        processor.processEmotionalContext(input, mockContext)
      ).rejects.toThrow('Emotional context processing failed');
    });

    it('should handle monitoring failures gracefully', async () => {
      mockMonitor.trackEmotionalAnalysis.mockRejectedValueOnce(
        new Error('Monitoring failed')
      );

      const result = await processor.processEmotionalContext(
        'Test input',
        mockContext
      );
      expect(result.metadata.confidenceScore).toBeLessThan(1);
    });
  });

  describe('integration', () => {
    it('should maintain consistency across multiple analyses', async () => {
      const input = "I'm feeling great!";
      const results = await Promise.all([
        processor.processEmotionalContext(input, mockContext),
        processor.processEmotionalContext(input, mockContext),
        processor.processEmotionalContext(input, mockContext)
      ]);

      const [first, ...rest] = results;
      rest.forEach(result => {
        expect(result.state.primary).toBe(first.state.primary);
        expect(result.state.intensity).toBeCloseTo(first.state.intensity, 2);
      });
    });

    it('should handle complex emotional scenarios', async () => {
      const complexContext: EmotionalContext = {
        history: [
          {
            primary: 'joy',
            intensity: 0.8,
            confidence: 0.9,
            dimensions: { valence: 0.8, arousal: 0.7, dominance: 0.6 }
          },
          {
            primary: 'sadness',
            intensity: 0.6,
            confidence: 0.8,
            dimensions: { valence: -0.6, arousal: -0.4, dominance: -0.3 }
          }
        ],
        situation: {
          type: 'important_meeting',
          intensity: 0.7,
          valence: 0.2
        },
        relationships: [
          {
            type: 'professional',
            strength: 0.6,
            valence: 0.4
          }
        ],
        environment: {
          type: 'formal',
          impact: 0.5
        }
      };

      const result = await processor.processEmotionalContext(
        "I'm both excited and nervous about this presentation",
        complexContext
      );

      expect(result.state.secondary).toBeDefined();
      expect(result.state.secondary!.length).toBeGreaterThan(1);
      expect(result.insights.length).toBeGreaterThan(2);
      expect(result.recommendations.length).toBeGreaterThan(1);
    });
  });
}); 