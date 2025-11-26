import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { userService, User, authService } from '../services/auth.service';
import { ArrowLeft, Edit, Trash2, Plus, LogOut } from 'lucide-react';

export default function UsersPage() {
  const navigate = useNavigate();
  const { themeConfig } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'operator',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.id, formData);
        setMessage({ type: 'success', text: 'User updated successfully' });
      } else {
        await userService.createUser(formData);
        setMessage({ type: 'success', text: 'User created successfully' });
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ username: '', email: '', password: '', role: 'operator' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save user' });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(id);
        setMessage({ type: 'success', text: 'User deleted successfully' });
        fetchUsers();
      } catch (err: any) {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user' });
      }
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

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: themeConfig.colors.background }}
    >
      {/* Navbar */}
      <nav
        className="border-b backdrop-blur-sm sticky top-0 z-50"
        style={{
          borderColor: themeConfig.colors.border,
          backgroundColor: `${themeConfig.colors.surface}99`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: themeConfig.colors.primary }}
            >
              <ArrowLeft size={24} />
              <span className="font-semibold">Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 text-white"
                style={{ background: themeConfig.colors.gradient }}
              >
                <LogOut className="inline mr-2" size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: themeConfig.colors.text }}
            >
              👥 User Management
            </h1>
            <p
              className="text-lg"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              Create, edit, and manage users
            </p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ username: '', email: '', password: '', role: 'operator' });
              setShowForm(!showForm);
            }}
            className="px-6 py-3 rounded-lg font-bold text-white transition-all transform hover:scale-105 flex items-center gap-2"
            style={{ background: themeConfig.colors.gradient }}
          >
            <Plus size={20} />
            Add New User
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className="p-4 rounded-xl mb-6 border-l-4 transition-all animate-fade-in"
            style={{
              backgroundColor: `${message.type === 'success' ? themeConfig.colors.success : themeConfig.colors.error}20`,
              borderLeftColor: message.type === 'success' ? themeConfig.colors.success : themeConfig.colors.error,
              color: message.type === 'success' ? themeConfig.colors.success : themeConfig.colors.error,
            }}
          >
            <p className="font-bold flex items-center gap-2">
              <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
              {message.text}
            </p>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div
            className="rounded-2xl p-6 mb-8 border-2"
            style={{
              backgroundColor: themeConfig.colors.surface,
              borderColor: themeConfig.colors.border,
            }}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{ color: themeConfig.colors.text }}
            >
              {editingUser ? 'Edit User' : 'Create New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: themeConfig.colors.text }}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: themeConfig.colors.border,
                      backgroundColor: themeConfig.colors.surfaceLight,
                      color: themeConfig.colors.text,
                    }}
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: themeConfig.colors.text }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: themeConfig.colors.border,
                      backgroundColor: themeConfig.colors.surfaceLight,
                      color: themeConfig.colors.text,
                    }}
                    required
                  />
                </div>
              </div>
              {!editingUser && (
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: themeConfig.colors.text }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: themeConfig.colors.border,
                      backgroundColor: themeConfig.colors.surfaceLight,
                      color: themeConfig.colors.text,
                    }}
                    required
                  />
                </div>
              )}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: themeConfig.colors.text }}
                >
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                  style={{
                    borderColor: themeConfig.colors.border,
                    backgroundColor: themeConfig.colors.surfaceLight,
                    color: themeConfig.colors.text,
                  }}
                >
                  <option value="operator">Operator</option>
                  <option value="manager">Manager</option>
                  <option value="distributor">Distributor</option>
                  <option value="master_admin">Master Admin</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg font-bold text-white transition-all"
                  style={{ background: themeConfig.colors.gradient }}
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 rounded-lg font-bold border-2"
                  style={{
                    borderColor: themeConfig.colors.border,
                    color: themeConfig.colors.text,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div
          className="rounded-2xl border-2 overflow-hidden shadow-lg transition-all hover:shadow-xl"
          style={{
            backgroundColor: themeConfig.colors.surface,
            borderColor: themeConfig.colors.border,
          }}
        >
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block">
                <div
                  className="w-12 h-12 border-4 border-transparent rounded-full animate-spin"
                  style={{
                    borderTopColor: themeConfig.colors.primary,
                    borderRightColor: themeConfig.colors.accent,
                  }}
                ></div>
              </div>
              <p
                className="mt-4 font-semibold"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                ⏳ Loading users...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p
                className="text-4xl mb-2"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                👥
              </p>
              <p
                className="font-semibold"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                No users found. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      backgroundColor: themeConfig.colors.surfaceLight,
                      borderBottomColor: themeConfig.colors.border,
                    }}
                    className="border-b"
                  >
                    <th className="px-6 py-4 text-left font-bold uppercase tracking-wider" style={{ color: themeConfig.colors.text }}>
                      👤 Username
                    </th>
                    <th className="px-6 py-4 text-left font-bold uppercase tracking-wider" style={{ color: themeConfig.colors.text }}>
                      📧 Email
                    </th>
                    <th className="px-6 py-4 text-left font-bold uppercase tracking-wider" style={{ color: themeConfig.colors.text }}>
                      🔐 Role
                    </th>
                    <th className="px-6 py-4 text-left font-bold uppercase tracking-wider" style={{ color: themeConfig.colors.text }}>
                      ✅ Status
                    </th>
                    <th className="px-6 py-4 text-left font-bold uppercase tracking-wider" style={{ color: themeConfig.colors.text }}>
                      ⚙️ Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b transition-all duration-200 hover:bg-opacity-50"
                      style={{
                        borderBottomColor: themeConfig.colors.border,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${themeConfig.colors.primary}08`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="px-6 py-4 font-semibold" style={{ color: themeConfig.colors.text }}>
                        👤 {user.username}
                      </td>
                      <td className="px-6 py-4" style={{ color: themeConfig.colors.textSecondary }}>
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:scale-110"
                          style={{
                            backgroundColor: `${themeConfig.colors.primary}20`,
                            color: themeConfig.colors.primary,
                          }}
                        >
                          🔐 {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 w-fit"
                          style={{
                            backgroundColor: `${user.isActive ? themeConfig.colors.success : themeConfig.colors.error}20`,
                            color: user.isActive ? themeConfig.colors.success : themeConfig.colors.error,
                          }}
                        >
                          {user.isActive ? '🟢' : '🔴'} {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 rounded-lg transition-all transform hover:scale-110 hover:shadow-lg"
                            style={{
                              backgroundColor: `${themeConfig.colors.primary}20`,
                              color: themeConfig.colors.primary,
                              border: `1px solid ${themeConfig.colors.primary}40`,
                            }}
                            title="Edit user"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 rounded-lg transition-all transform hover:scale-110 hover:shadow-lg"
                            style={{
                              backgroundColor: `${themeConfig.colors.error}20`,
                              color: themeConfig.colors.error,
                              border: `1px solid ${themeConfig.colors.error}40`,
                            }}
                            title="Delete user"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out forwards;
          }
        `}</style>
      </main>
    </div>
  );
}
