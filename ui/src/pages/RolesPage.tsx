import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { userService, authService } from '../services/auth.service';
import { ArrowLeft, LogOut } from 'lucide-react';

interface Role {
  name: string;
  level: number;
  description: string;
  permissions: string[];
  emoji: string;
}

const ROLE_HIERARCHY: Role[] = [
  {
    name: 'Master Admin',
    level: 4,
    emoji: '👑',
    description: 'Full access to everything',
    permissions: [
      'manage_users',
      'manage_licenses',
      'manage_roles',
      'view_audit_logs',
      'system_settings',
      'manage_campaigns',
      'manage_contacts',
      'manage_templates',
    ],
  },
  {
    name: 'Distributor',
    level: 3,
    emoji: '🏢',
    description: 'Manage own business + team',
    permissions: [
      'manage_team',
      'manage_licenses',
      'view_audit_logs',
      'manage_campaigns',
      'manage_contacts',
      'manage_templates',
    ],
  },
  {
    name: 'Manager',
    level: 2,
    emoji: '👔',
    description: 'Manage team & campaigns',
    permissions: [
      'manage_team',
      'manage_campaigns',
      'manage_contacts',
      'manage_templates',
      'view_analytics',
    ],
  },
  {
    name: 'Operator',
    level: 1,
    emoji: '👤',
    description: 'Create & run campaigns',
    permissions: ['create_campaigns', 'manage_contacts', 'use_templates', 'view_analytics'],
  },
];

export default function RolesPage() {
  const navigate = useNavigate();
  const { themeConfig } = useTheme();
  const [selectedRole, setSelectedRole] = useState<Role>(ROLE_HIERARCHY[0]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const usersByRole = ROLE_HIERARCHY.reduce((acc, role) => {
    acc[role.name] = users.filter((u) => u.role.toLowerCase() === role.name.toLowerCase().replace(' ', '_'));
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: themeConfig.colors.background }}
    >
      {/* Navbar */}
      <nav
        className="border-b backdrop-blur-xl sticky top-0 z-50 transition-all duration-300"
        style={{
          borderColor: themeConfig.colors.border,
          backgroundColor: `${themeConfig.colors.surface}dd`,
          boxShadow: `0 4px 20px ${themeConfig.colors.primary}15`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 transition-all hover:gap-3 transform hover:scale-105"
              style={{ color: themeConfig.colors.primary }}
            >
              <ArrowLeft size={24} />
              <span className="font-bold">Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 text-white flex items-center gap-2"
                style={{ background: themeConfig.colors.gradient }}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: themeConfig.colors.text }}
          >
            🔐 Roles & Permissions
          </h1>
          <p
            className="text-lg"
            style={{ color: themeConfig.colors.textSecondary }}
          >
            View role hierarchy and permissions
          </p>
        </div>

        {/* Role Hierarchy */}
        <div className="mb-12">
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: themeConfig.colors.text }}
          >
            📊 Role Hierarchy
          </h2>
          <div className="relative">
            {/* Hierarchy Line */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2"
              style={{ background: themeConfig.colors.border }}
            ></div>

            {/* Roles */}
            <div className="space-y-8">
              {ROLE_HIERARCHY.map((role, idx) => (
                <div key={role.name} className="relative">
                  {/* Connector */}
                  {idx < ROLE_HIERARCHY.length - 1 && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-8"
                      style={{ background: themeConfig.colors.border }}
                    ></div>
                  )}

                  {/* Role Card */}
                  <div
                    className="relative z-10 mx-auto max-w-sm rounded-xl p-6 border-2 cursor-pointer transition-all transform hover:scale-105 hover:-translate-y-1"
                    style={{
                      backgroundColor:
                        selectedRole.name === role.name
                          ? `${themeConfig.colors.primary}20`
                          : themeConfig.colors.surface,
                      borderColor:
                        selectedRole.name === role.name
                          ? themeConfig.colors.primary
                          : themeConfig.colors.border,
                    }}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{role.emoji}</span>
                      <div>
                        <h3
                          className="font-bold text-lg"
                          style={{ color: themeConfig.colors.text }}
                        >
                          {role.name}
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: themeConfig.colors.textSecondary }}
                        >
                          Level {role.level}
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: themeConfig.colors.textSecondary }}
                    >
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Role Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Permissions */}
          <div
            className="rounded-2xl p-6 border-2"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: themeConfig.colors.border,
            }}
          >
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: themeConfig.colors.text }}
            >
              {selectedRole.emoji} {selectedRole.name} Permissions
            </h3>
            <div className="space-y-3">
              {selectedRole.permissions.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: `${themeConfig.colors.primary}10`,
                    borderLeft: `3px solid ${themeConfig.colors.primary}`,
                  }}
                >
                  <span style={{ color: themeConfig.colors.primary }}>✓</span>
                  <span style={{ color: themeConfig.colors.text }}>{perm.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Users with this role */}
          <div
            className="rounded-2xl p-6 border-2"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: themeConfig.colors.border,
            }}
          >
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: themeConfig.colors.text }}
            >
              👥 Users with this role
            </h3>
            <div className="space-y-2">
              {loading ? (
                <p style={{ color: themeConfig.colors.textSecondary }}>Loading...</p>
              ) : usersByRole[selectedRole.name]?.length === 0 ? (
                <p style={{ color: themeConfig.colors.textSecondary }}>No users with this role</p>
              ) : (
                usersByRole[selectedRole.name]?.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 rounded-lg border-l-4"
                    style={{
                      backgroundColor: themeConfig.colors.surfaceLight,
                      borderLeftColor: themeConfig.colors.primary,
                    }}
                  >
                    <p
                      className="font-semibold"
                      style={{ color: themeConfig.colors.text }}
                    >
                      {user.username}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: themeConfig.colors.textSecondary }}
                    >
                      {user.email}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RBAC Features */}
        <div className="mt-12">
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: themeConfig.colors.text }}
          >
            🎯 RBAC Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: '📊', title: 'Role Hierarchy', desc: '4-tier structure with inheritance' },
              { emoji: '🔐', title: 'Permission Control', desc: 'Feature-level access control' },
              { emoji: '👤', title: 'User Assignment', desc: 'Easy role assignment' },
              { emoji: '📋', title: 'Audit Logging', desc: 'Track role changes' },
              { emoji: '🔄', title: 'Inheritance', desc: 'Automatic permission inheritance' },
              { emoji: '✅', title: 'Validation', desc: 'Built-in role validation' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl border-2 transition-all hover:-translate-y-1"
                style={{
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: themeConfig.colors.border,
                }}
              >
                <p className="text-3xl mb-2">{feature.emoji}</p>
                <h3
                  className="font-bold text-lg mb-1"
                  style={{ color: themeConfig.colors.text }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: themeConfig.colors.textSecondary }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
