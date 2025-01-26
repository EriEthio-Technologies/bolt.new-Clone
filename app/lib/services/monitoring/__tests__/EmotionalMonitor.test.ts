import { EmotionalMonitor } from '../EmotionalMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { EmotionalAnalysis } from '~/types/emotional';

jest.mock('@google-cloud/monitoring');

describe('EmotionalMonitor', () => {
  let monitor: EmotionalMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockAnalysis: EmotionalAnalysis = {
    state: {
      primary: 'joy',
      intensity: 0.8,
      confidence: 0.9,
      dimensions: {
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.5
      }
    },
    timestamp: new Date(),
    metadata: {
      inputLength: 100,
      processingTime: 150,
      confidenceScore: 0.9,
      version: '1.0.0'
    },
    insights: ['Positive emotional state detected'],
    recommendations: ['Continue with current approach']
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new EmotionalMonitor();
  });

  describe('trackEmotionalAnalysis', () => {
    it('should track all emotional metrics successfully', async () => {
      await monitor.trackEmotionalAnalysis(mockAnalysis);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(1);
      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];

      // Verify valence metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/emotional/valence',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 0.7
              }
            })
          ]
        })
      );

      // Verify processing time metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/emotional/processing_time',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 150
              }
            })
          ]
        })
      );
    });

    it('should handle monitoring errors gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValueOnce(
        new Error('API Error')
      );

      await expect(monitor.trackEmotionalAnalysis(mockAnalysis))
        .rejects
        .toThrow('Emotional monitoring failed');
    });
  });

  describe('metric validation', () => {
    it('should validate metric values are within bounds', async () => {
      const invalidAnalysis = {
        ...mockAnalysis,
        state: {
          ...mockAnalysis.state,
          dimensions: {
            valence: 2, // Invalid: should be between -1 and 1
            arousal: 0.5,
            dominance: 0.5
          }
        }
      };

      await expect(monitor.trackEmotionalAnalysis(invalidAnalysis))
        .rejects
        .toThrow();
    });
  });

  describe('integration', () => {
    it('should handle concurrent monitoring requests', async () => {
      const analyses = Array(5).fill(mockAnalysis);
      await Promise.all(
        analyses.map(analysis => monitor.trackEmotionalAnalysis(analysis))
      );

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(5);
    });

    it('should maintain metric consistency', async () => {
      const analyses = Array(3).fill(mockAnalysis);
      await Promise.all(
        analyses.map(analysis => monitor.trackEmotionalAnalysis(analysis))
      );

      const calls = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls;
      const firstCall = calls[0][0];
      calls.forEach(call => {
        expect(call[0].timeSeries).toEqual(firstCall.timeSeries);
      });
    });
  });
}); 