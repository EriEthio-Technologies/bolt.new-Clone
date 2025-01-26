import { RBACService } from '../RBACService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';

jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');

describe('RBACService', () => {
  let service: RBACService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    service = new RBACService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('returns true for valid viewer permission', async () => {
      const result = await service.checkPermission({
        userId: 'user1',
        roleId: 'viewer',
        resource: 'documents',
        action: 'read'
      });

      expect(result).toBe(true);
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'RBACService',
        duration: expect.any(Number),
        variant: 'checkPermission',
        hasOverlay: false
      });
    });

    it('returns false for invalid viewer permission', async () => {
      const result = await service.checkPermission({
        userId: 'user1',
        roleId: 'viewer',
        resource: 'documents',
        action: 'write'
      });

      expect(result).toBe(false);
    });

    it('returns true for developer write permission', async () => {
      const result = await service.checkPermission({
        userId: 'user1',
        roleId: 'developer',
        resource: 'documents',
        action: 'create'
      });

      expect(result).toBe(true);
    });

    it('returns true for admin all permissions', async () => {
      const result = await service.checkPermission({
        userId: 'user1',
        roleId: 'admin',
        resource: 'anything',
        action: 'anything'
      });

      expect(result).toBe(true);
    });

    it('throws error for non-existent role', async () => {
      await expect(service.checkPermission({
        userId: 'user1',
        roleId: 'nonexistent',
        resource: 'documents',
        action: 'read'
      })).rejects.toThrow('Role nonexistent not found');

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'RBACService',
        'Failed to check permission',
        expect.any(Object)
      );
    });
  });

  describe('assignRole', () => {
    it('assigns role successfully', async () => {
      await service.assignRole({
        userId: 'user1',
        roleId: 'developer'
      });

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'RBACService',
        duration: expect.any(Number),
        variant: 'assignRole',
        hasOverlay: false
      });
    });

    it('throws error for non-existent role', async () => {
      await expect(service.assignRole({
        userId: 'user1',
        roleId: 'nonexistent'
      })).rejects.toThrow('Role nonexistent not found');

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'RBACService',
        'Failed to assign role',
        expect.any(Object)
      );
    });
  });

  describe('createCustomRole', () => {
    it('creates custom role successfully', async () => {
      const role = await service.createCustomRole({
        name: 'Custom Role',
        description: 'Custom role description',
        permissions: ['read', 'write']
      });

      expect(role).toMatchObject({
        name: 'Custom Role',
        description: 'Custom role description',
        permissions: expect.arrayContaining([
          expect.objectContaining({ id: 'read' }),
          expect.objectContaining({ id: 'write' })
        ])
      });

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'RBACService',
        duration: expect.any(Number),
        variant: 'createCustomRole',
        hasOverlay: false
      });
    });

    it('creates role with only valid permissions', async () => {
      const role = await service.createCustomRole({
        name: 'Custom Role',
        description: 'Custom role description',
        permissions: ['read', 'nonexistent']
      });

      expect(role.permissions).toHaveLength(1);
      expect(role.permissions[0].id).toBe('read');
    });

    it('handles role creation errors', async () => {
      const error = new Error('Failed to create role');
      mockUIMonitor.trackLoadingState.mockRejectedValue(error);

      await expect(service.createCustomRole({
        name: 'Custom Role',
        description: 'Custom role description',
        permissions: ['read']
      })).rejects.toThrow(error);

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'RBACService',
        'Failed to create custom role',
        expect.any(Object)
      );
    });
  });
}); 