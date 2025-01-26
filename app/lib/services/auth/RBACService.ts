import { Service } from 'typedi';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from '../debug/DebugService';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

@Service()
export class RBACService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private roles: Map<string, Role>;
  private permissions: Map<string, Permission>;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.roles = new Map();
    this.permissions = new Map();
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    // Define default permissions
    const readPermission: Permission = {
      id: 'read',
      name: 'Read Access',
      description: 'Can read resources',
      resource: '*',
      actions: ['read', 'list']
    };

    const writePermission: Permission = {
      id: 'write',
      name: 'Write Access',
      description: 'Can modify resources',
      resource: '*',
      actions: ['create', 'update', 'delete']
    };

    const adminPermission: Permission = {
      id: 'admin',
      name: 'Admin Access',
      description: 'Full administrative access',
      resource: '*',
      actions: ['*']
    };

    this.permissions.set(readPermission.id, readPermission);
    this.permissions.set(writePermission.id, writePermission);
    this.permissions.set(adminPermission.id, adminPermission);

    // Define default roles
    this.roles.set('viewer', {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [readPermission]
    });

    this.roles.set('developer', {
      id: 'developer',
      name: 'Developer',
      description: 'Read and write access',
      permissions: [readPermission, writePermission]
    });

    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrator',
      description: 'Full access',
      permissions: [readPermission, writePermission, adminPermission]
    });
  }

  async checkPermission(params: {
    userId: string;
    roleId: string;
    resource: string;
    action: string;
  }): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'RBACService', 'Checking permission', params);

      const role = this.roles.get(params.roleId);
      if (!role) {
        throw new Error(`Role ${params.roleId} not found`);
      }

      const hasPermission = role.permissions.some(permission => 
        (permission.resource === '*' || permission.resource === params.resource) &&
        (permission.actions.includes('*') || permission.actions.includes(params.action))
      );

      await this.uiMonitor.trackLoadingState({
        component: 'RBACService',
        duration: Date.now() - startTime,
        variant: 'checkPermission',
        hasOverlay: false
      });

      return hasPermission;
    } catch (error) {
      this.debug.log('error', 'RBACService', 'Failed to check permission', { error });
      throw error;
    }
  }

  async assignRole(params: {
    userId: string;
    roleId: string;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'RBACService', 'Assigning role', params);

      if (!this.roles.has(params.roleId)) {
        throw new Error(`Role ${params.roleId} not found`);
      }

      // Here we would update the user's role in the database

      await this.uiMonitor.trackLoadingState({
        component: 'RBACService',
        duration: Date.now() - startTime,
        variant: 'assignRole',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'RBACService', 'Failed to assign role', { error });
      throw error;
    }
  }

  async createCustomRole(params: {
    name: string;
    description: string;
    permissions: string[];
  }): Promise<Role> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'RBACService', 'Creating custom role', params);

      const rolePermissions = params.permissions
        .map(id => this.permissions.get(id))
        .filter((p): p is Permission => p !== undefined);

      const role: Role = {
        id: `role_${Date.now()}`,
        name: params.name,
        description: params.description,
        permissions: rolePermissions
      };

      this.roles.set(role.id, role);

      await this.uiMonitor.trackLoadingState({
        component: 'RBACService',
        duration: Date.now() - startTime,
        variant: 'createCustomRole',
        hasOverlay: false
      });

      return role;
    } catch (error) {
      this.debug.log('error', 'RBACService', 'Failed to create custom role', { error });
      throw error;
    }
  }
} 