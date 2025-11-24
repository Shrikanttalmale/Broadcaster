import { v4 as uuidv4 } from 'uuid';

export type UserRole = 'master_admin' | 'distributor' | 'manager' | 'operator';

export interface Permission {
  action: string;
  resource: string;
  description: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  status: 'success' | 'denied';
  reason?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class RBACService {
  private auditLogs: AuditLog[] = [];

  // Permission matrix for each role
  private readonly rolePermissions: Record<UserRole, Permission[]> = {
    master_admin: [
      { action: 'create', resource: 'users', description: 'Create new users' },
      { action: 'read', resource: 'users', description: 'Read user data' },
      { action: 'update', resource: 'users', description: 'Update user data' },
      { action: 'delete', resource: 'users', description: 'Delete users' },
      { action: 'create', resource: 'licenses', description: 'Create licenses' },
      { action: 'read', resource: 'licenses', description: 'Read license data' },
      { action: 'update', resource: 'licenses', description: 'Update licenses' },
      { action: 'delete', resource: 'licenses', description: 'Delete licenses' },
      { action: 'create', resource: 'campaigns', description: 'Create campaigns' },
      { action: 'read', resource: 'campaigns', description: 'Read campaigns' },
      { action: 'update', resource: 'campaigns', description: 'Update campaigns' },
      { action: 'delete', resource: 'campaigns', description: 'Delete campaigns' },
      { action: 'read', resource: 'analytics', description: 'View analytics' },
      { action: 'read', resource: 'reports', description: 'View reports' },
      { action: 'create', resource: 'plans', description: 'Create plans' },
      { action: 'update', resource: 'plans', description: 'Update plans' },
      { action: 'manage', resource: 'roles', description: 'Manage user roles' },
      { action: 'manage', resource: 'permissions', description: 'Manage permissions' },
    ],
    distributor: [
      { action: 'read', resource: 'users', description: 'Read user data' },
      { action: 'create', resource: 'users', description: 'Create users (manager/operator only)' },
      { action: 'update', resource: 'users', description: 'Update own team users' },
      { action: 'read', resource: 'licenses', description: 'Read own licenses' },
      { action: 'create', resource: 'campaigns', description: 'Create campaigns' },
      { action: 'read', resource: 'campaigns', description: 'Read own campaigns' },
      { action: 'update', resource: 'campaigns', description: 'Update own campaigns' },
      { action: 'read', resource: 'analytics', description: 'View own analytics' },
      { action: 'read', resource: 'reports', description: 'View own reports' },
      { action: 'manage', resource: 'branding', description: 'Manage white-label branding' },
    ],
    manager: [
      { action: 'read', resource: 'users', description: 'Read user data' },
      { action: 'create', resource: 'users', description: 'Create operators' },
      { action: 'update', resource: 'users', description: 'Update own team' },
      { action: 'create', resource: 'campaigns', description: 'Create campaigns' },
      { action: 'read', resource: 'campaigns', description: 'Read team campaigns' },
      { action: 'update', resource: 'campaigns', description: 'Update campaigns' },
      { action: 'read', resource: 'analytics', description: 'View team analytics' },
      { action: 'read', resource: 'reports', description: 'View team reports' },
    ],
    operator: [
      { action: 'create', resource: 'campaigns', description: 'Create campaigns' },
      { action: 'read', resource: 'campaigns', description: 'Read own campaigns' },
      { action: 'update', resource: 'campaigns', description: 'Update own campaigns' },
      { action: 'read', resource: 'analytics', description: 'View own analytics' },
    ],
  };

  /**
   * Check if user has a specific role
   */
  hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      master_admin: 4,
      distributor: 3,
      manager: 2,
      operator: 1,
    };

    // User can have same or higher level role permission
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(userRole: UserRole, action: string, resource: string): boolean {
    const permissions = this.rolePermissions[userRole] || [];
    return permissions.some(
      (p) => p.action === action && p.resource === resource
    );
  }

  /**
   * Check multiple permissions (all must be true)
   */
  hasAllPermissions(
    userRole: UserRole,
    requiredPermissions: Array<{ action: string; resource: string }>
  ): boolean {
    return requiredPermissions.every((req) =>
      this.hasPermission(userRole, req.action, req.resource)
    );
  }

  /**
   * Check multiple permissions (at least one must be true)
   */
  hasAnyPermission(
    userRole: UserRole,
    requiredPermissions: Array<{ action: string; resource: string }>
  ): boolean {
    return requiredPermissions.some((req) =>
      this.hasPermission(userRole, req.action, req.resource)
    );
  }

  /**
   * Can user access a resource
   */
  canAccessResource(userRole: UserRole, resource: string): boolean {
    const permissions = this.rolePermissions[userRole] || [];
    return permissions.some((p) => p.resource === resource);
  }

  /**
   * Can user perform action on resource
   */
  canPerformAction(userRole: UserRole, action: string, resource: string): boolean {
    return this.hasPermission(userRole, action, resource);
  }

  /**
   * Can user access a feature based on license
   */
  canAccessFeature(userRole: UserRole, feature: string, enabledFeatures?: Record<string, boolean>): boolean {
    // Master admin always has access
    if (userRole === 'master_admin') {
      return true;
    }

    // If enabled features provided, check against it
    if (enabledFeatures) {
      return enabledFeatures[feature] === true;
    }

    // Otherwise check based on role
    const featuresByRole: Record<UserRole, string[]> = {
      master_admin: [
        'multi_account',
        'campaigns',
        'templates',
        'analytics',
        'white_label',
        'admin_panel',
      ],
      distributor: [
        'multi_account',
        'campaigns',
        'templates',
        'analytics',
        'white_label',
      ],
      manager: ['campaigns', 'templates', 'analytics'],
      operator: ['campaigns'],
    };

    return featuresByRole[userRole]?.includes(feature) || false;
  }

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: UserRole): Permission[] {
    return this.rolePermissions[role] || [];
  }

  /**
   * Get all available roles
   */
  getAllRoles(): RolePermissions[] {
    const roles: RolePermissions[] = [
      {
        role: 'master_admin',
        permissions: this.rolePermissions.master_admin,
        description: 'Full system access - can manage everything',
      },
      {
        role: 'distributor',
        permissions: this.rolePermissions.distributor,
        description: 'Can manage own distributorship and team',
      },
      {
        role: 'manager',
        permissions: this.rolePermissions.manager,
        description: 'Can manage own team and campaigns',
      },
      {
        role: 'operator',
        permissions: this.rolePermissions.operator,
        description: 'Can create and manage own campaigns',
      },
    ];

    return roles;
  }

  /**
   * Check if role can be assigned by current user
   */
  canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    // Master admin can assign all roles
    if (assignerRole === 'master_admin') {
      return true;
    }

    // Distributor can assign manager and operator
    if (assignerRole === 'distributor') {
      return targetRole === 'manager' || targetRole === 'operator';
    }

    // Manager can assign operator only
    if (assignerRole === 'manager') {
      return targetRole === 'operator';
    }

    // Operator cannot assign roles
    return false;
  }

  /**
   * Get role hierarchy level
   */
  getRoleLevel(role: UserRole): number {
    const levels: Record<UserRole, number> = {
      master_admin: 4,
      distributor: 3,
      manager: 2,
      operator: 1,
    };
    return levels[role] || 0;
  }

  /**
   * Log access attempt for audit
   */
  logAccess(
    userId: string,
    action: string,
    resource: string,
    allowed: boolean,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): AuditLog {
    const auditLog: AuditLog = {
      id: uuidv4(),
      userId,
      action,
      resource,
      status: allowed ? 'success' : 'denied',
      reason,
      timestamp: new Date(),
      ipAddress,
      userAgent,
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    return auditLog;
  }

  /**
   * Get audit logs (with optional filtering)
   */
  getAuditLogs(
    userId?: string,
    status?: 'success' | 'denied',
    limit?: number
  ): AuditLog[] {
    let logs = this.auditLogs;

    if (userId) {
      logs = logs.filter((log) => log.userId === userId);
    }

    if (status) {
      logs = logs.filter((log) => log.status === status);
    }

    if (limit) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  /**
   * Get role description
   */
  getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      master_admin: 'Master Administrator - Full system access',
      distributor: 'Distributor - Manage own distributorship',
      manager: 'Manager - Manage team and campaigns',
      operator: 'Operator - Create and manage campaigns',
    };

    return descriptions[role] || 'Unknown Role';
  }

  /**
   * Can user delete other user
   */
  canDeleteUser(deleterRole: UserRole, targetRole: UserRole): boolean {
    // Can only delete users with equal or lower role
    const deleterLevel = this.getRoleLevel(deleterRole);
    const targetLevel = this.getRoleLevel(targetRole);

    return deleterLevel > targetLevel;
  }
}

export default new RBACService();
