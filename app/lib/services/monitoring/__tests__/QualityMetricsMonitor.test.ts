import { QualityMetricsMonitor } from '../QualityMetricsMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { CodeQualityResult } from '~/types/quality';

jest.mock('@google-cloud/monitoring');

describe('QualityMetricsMonitor', () => {
  let monitor: QualityMetricsMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockQualityResult: CodeQualityResult = {
    metrics: {
      codeSize: {
        lines: 100,
        statements: 50,
        functions: 10,
        classes: 5
      },
      complexity: {
        cyclomatic: 15,
        cognitive: 8,
        halstead: {
          difficulty: 12,
          effort: 1500,
          time: 83.33,
          bugs: 0.5
        }
      },
      maintainability: {
        index: 85,
        technicalDebtRatio: 8,
        testCoverage: 80
      }
    },
    coverage: {
      lines: { total: 100, covered: 80, percentage: 80 },
      functions: { total: 20, covered: 16, percentage: 80 },
      branches: { total: 30, covered: 24, percentage: 80 },
      statements: { total: 150, covered: 120, percentage: 80 }
    },
    duplication: {
      percentage: 5,
      duplicates: []
    },
    technicalDebt: {
      rating: 'B',
      ratio: 8,
      issues: [],
      effort: 120
    },
    timestamp: new Date()
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('test-project-path'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new QualityMetricsMonitor();
  });

  describe('trackQualityMetrics', () => {
    it('should track all quality metrics successfully', async () => {
      await monitor.trackQualityMetrics(mockQualityResult);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(4);
      
      // Verify complexity metrics
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/code_quality/complexity/cyclomatic',
                labels: expect.any(Object)
              }
            })
          ])
        })
      );

      // Verify coverage metrics
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/code_quality/coverage/lines',
                labels: expect.any(Object)
              }
            })
          ])
        })
      );

      // Verify duplication metrics
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/code_quality/duplication/percentage',
                labels: expect.any(Object)
              }
            })
          ])
        })
      );

      // Verify technical debt metrics
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/code_quality/technical_debt/rating',
                labels: expect.any(Object)
              }
            })
          ])
        })
      );
    });

    it('should handle monitoring failures gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValue(
        new Error('Monitoring failed')
      );

      await expect(monitor.trackQualityMetrics(mockQualityResult))
        .rejects
        .toThrow('Quality metrics monitoring failed');
    });

    it('should convert technical debt ratings correctly', () => {
      const ratings: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
      const expected = [1, 2, 3, 4, 5];

      ratings.forEach((rating, index) => {
        const result = (monitor as any).convertRatingToNumber(rating);
        expect(result).toBe(expected[index]);
      });
    });

    it('should create time series with correct data structure', async () => {
      await monitor.trackQualityMetrics(mockQualityResult);

      const createTimeSeriesCall = mockMonitoring.createTimeSeries.mock.calls[0][0];
      
      expect(createTimeSeriesCall).toMatchObject({
        name: expect.any(String),
        timeSeries: expect.arrayContaining([
          expect.objectContaining({
            metric: {
              type: expect.any(String),
              labels: {
                environment: expect.any(String)
              }
            },
            resource: {
              type: 'global',
              labels: {
                project_id: expect.any(String)
              }
            },
            points: [
              expect.objectContaining({
                interval: {
                  endTime: expect.any(Object)
                },
                value: {
                  doubleValue: expect.any(Number)
                }
              })
            ]
          })
        ])
      });
    });

    it('should validate input data', async () => {
      await expect(monitor.trackQualityMetrics(null as any))
        .rejects
        .toThrow('Invalid quality metrics result');

      await expect(monitor.trackQualityMetrics({} as any))
        .rejects
        .toThrow('Invalid quality metrics result');
    });
  });

  describe('integration', () => {
    it('should integrate with GCP monitoring', async () => {
      const result = await monitor.trackQualityMetrics(mockQualityResult);
      
      // Verify metrics were created
      const metrics = await new Monitoring().listMetricDescriptors({
        name: monitor.projectPath,
        filter: 'metric.type = starts_with("custom.googleapis.com/code_quality")'
      });
      
      expect(metrics).toBeDefined();
      expect(metrics[0]).toHaveLength(4); // All metric types created
    });
  });
}); 