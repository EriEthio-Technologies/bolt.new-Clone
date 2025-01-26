import { WorkflowService } from '../WorkflowService';
import { CIPipelineService } from '../CIPipelineService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';

jest.mock('../CIPipelineService');
jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');

describe('WorkflowService', () => {
  let service: WorkflowService;
  let mockCIPipeline: jest.Mocked<CIPipelineService>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    mockCIPipeline = {
      triggerPipeline: jest.fn(),
      getPipelineStatus: jest.fn(),
      autoMergePipeline: jest.fn()
    } as any;

    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    (CIPipelineService as jest.Mock).mockImplementation(() => mockCIPipeline);
    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    service = new WorkflowService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerWorkflow', () => {
    it('triggers workflow successfully', async () => {
      const mockResult = {
        id: 'test-id',
        url: 'https://github.com/test/test/actions/runs/1'
      };

      mockCIPipeline.triggerPipeline.mockResolvedValue(mockResult);

      const result = await service.triggerWorkflow({
        name: 'build',
        branch: 'main',
        commitSha: 'abc123'
      });

      expect(result).toEqual(mockResult);
      expect(mockCIPipeline.triggerPipeline).toHaveBeenCalledWith({
        workflow: '.github/workflows/build.yml',
        branch: 'main',
        commitSha: 'abc123'
      });
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalled();
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'WorkflowService',
        'Triggering workflow',
        expect.any(Object)
      );
    });

    it('handles non-existent workflow', async () => {
      await expect(service.triggerWorkflow({
        name: 'non-existent',
        branch: 'main',
        commitSha: 'abc123'
      })).rejects.toThrow('Workflow non-existent not found');
    });

    it('handles trigger errors', async () => {
      const error = new Error('Pipeline error');
      mockCIPipeline.triggerPipeline.mockRejectedValue(error);

      await expect(service.triggerWorkflow({
        name: 'build',
        branch: 'main',
        commitSha: 'abc123'
      })).rejects.toThrow(error);

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'WorkflowService',
        'Failed to trigger workflow',
        { error }
      );
    });
  });

  describe('monitorWorkflow', () => {
    it('monitors workflow and auto-merges on success', async () => {
      mockCIPipeline.getPipelineStatus.mockResolvedValue({
        id: 'test-id',
        status: 'success',
        checks: []
      });

      await service.monitorWorkflow('test-id');

      expect(mockCIPipeline.autoMergePipeline).toHaveBeenCalledWith('test-id');
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalled();
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'WorkflowService',
        'Monitoring workflow',
        { workflowId: 'test-id' }
      );
    });

    it('does not auto-merge on non-success status', async () => {
      mockCIPipeline.getPipelineStatus.mockResolvedValue({
        id: 'test-id',
        status: 'running',
        checks: []
      });

      await service.monitorWorkflow('test-id');

      expect(mockCIPipeline.autoMergePipeline).not.toHaveBeenCalled();
    });

    it('handles monitoring errors', async () => {
      const error = new Error('Monitoring error');
      mockCIPipeline.getPipelineStatus.mockRejectedValue(error);

      await expect(service.monitorWorkflow('test-id')).rejects.toThrow(error);

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'WorkflowService',
        'Failed to monitor workflow',
        { error }
      );
    });
  });
}); 