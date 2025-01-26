import { ABTestingService } from '../ABTestingService';
import { UIMonitor } from '../UIMonitor';
import { DebugService } from '../../debug/DebugService';
import { AnalyticsService } from '../AnalyticsService';

jest.mock('../UIMonitor');
jest.mock('../../debug/DebugService');
jest.mock('../AnalyticsService');

describe('ABTestingService', () => {
  let service: ABTestingService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;
  let mockAnalytics: jest.Mocked<AnalyticsService>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    mockAnalytics = {
      trackEvent: jest.fn().mockResolvedValue(undefined)
    } as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);
    (AnalyticsService as jest.Mock).mockImplementation(() => mockAnalytics);

    service = new ABTestingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createExperiment', () => {
    const experimentParams = {
      name: 'Test Experiment',
      variants: [
        { name: 'Control', weight: 1 },
        { name: 'Variant A', weight: 1 }
      ]
    };

    it('creates experiment successfully', async () => {
      const experiment = await service.createExperiment(experimentParams);

      expect(experiment).toMatchObject({
        name: experimentParams.name,
        variants: expect.arrayContaining([
          expect.objectContaining({ name: 'Control' }),
          expect.objectContaining({ name: 'Variant A' })
        ]),
        isActive: true
      });

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith({
        category: 'experiment',
        action: 'create',
        label: experimentParams.name
      });
    });

    it('handles creation errors', async () => {
      const error = new Error('Failed to create');
      mockUIMonitor.trackLoadingState.mockRejectedValue(error);

      await expect(service.createExperiment(experimentParams)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ABTestingService',
        'Failed to create experiment',
        { error }
      );
    });
  });

  describe('assignVariant', () => {
    let experimentId: string;

    beforeEach(async () => {
      const experiment = await service.createExperiment({
        name: 'Test Experiment',
        variants: [
          { name: 'Control', weight: 1 },
          { name: 'Variant A', weight: 1 }
        ]
      });
      experimentId = experiment.id;
    });

    it('assigns variant consistently for same user', async () => {
      const userId = 'user1';
      const variant1 = await service.assignVariant({ userId, experimentId });
      const variant2 = await service.assignVariant({ userId, experimentId });

      expect(variant1).toBe(variant2);
      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('throws error for invalid experiment', async () => {
      await expect(service.assignVariant({
        userId: 'user1',
        experimentId: 'invalid'
      })).rejects.toThrow('Experiment invalid not found or inactive');
    });
  });

  describe('trackConversion', () => {
    let experimentId: string;
    const userId = 'user1';

    beforeEach(async () => {
      const experiment = await service.createExperiment({
        name: 'Test Experiment',
        variants: [{ name: 'Control', weight: 1 }]
      });
      experimentId = experiment.id;
      await service.assignVariant({ userId, experimentId });
    });

    it('tracks conversion successfully', async () => {
      await service.trackConversion({
        userId,
        experimentId,
        conversionValue: 42
      });

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'experiment',
          action: 'conversion',
          value: 42
        })
      );
    });

    it('throws error for unassigned user', async () => {
      await expect(service.trackConversion({
        userId: 'unassigned',
        experimentId
      })).rejects.toThrow('No variant assignment found');
    });
  });
}); 