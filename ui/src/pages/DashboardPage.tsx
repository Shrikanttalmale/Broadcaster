import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { authService, User } from '../services/auth.service';
import { Users, Lock, FileText, LogOut, Menu, X, Zap, Shield, CheckCircle, MessageSquare, Send } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { themeConfig } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const menuItems = [
    { label: '👥 Users', icon: Users, path: '/users', color: '#3b82f6', desc: 'Manage team members' },
    { label: '📜 Licenses', icon: FileText, path: '/licenses', color: '#10b981', desc: 'License distribution' },
    { label: '🔐 Roles & Permissions', icon: Lock, path: '/roles', color: '#f59e0b', desc: 'Access control' },
  ];

  const features = [
    { emoji: '📱', title: 'Desktop Framework', desc: 'Electron-based desktop app', category: 'Core' },
    { emoji: '🎨', title: 'Modern UI', desc: 'React with Tailwind CSS', category: 'Frontend' },
    { emoji: '🔧', title: 'REST API', desc: '24+ endpoints built', category: 'Backend' },
    { emoji: '🔐', title: 'JWT Auth', desc: 'Secure token-based auth', category: 'Security' },
    { emoji: '👥', title: 'User Management', desc: 'Complete CRUD operations', category: 'Feature' },
    { emoji: '📜', title: 'License System', desc: 'Offline validation support', category: 'Feature' },
    { emoji: '🎯', title: '4-Tier RBAC', desc: 'Master, Distributor, Manager, Operator', category: 'Security' },
    { emoji: '🔑', title: 'Permission Control', desc: 'Feature-level access', category: 'Security' },
    { emoji: '📊', title: 'Audit Logging', desc: 'Track all actions', category: 'Feature' },
  ];

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: themeConfig.colors.background }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-transparent rounded-full animate-spin mx-auto mb-4"
            style={{
              borderTopColor: themeConfig.colors.primary,
              borderRightColor: themeConfig.colors.primary,
            }}
          ></div>
          <div
            className="text-xl font-semibold"
            style={{ color: themeConfig.colors.text }}
          >
            Loading Dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: themeConfig.colors.background }}
    >
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: themeConfig.colors.primary }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: themeConfig.colors.accent }}
        ></div>
      </div>

      {/* Navbar */}
      <nav
        className="border-b backdrop-blur-xl sticky top-0 z-50 transition-all duration-300"
        style={{
          borderColor: themeConfig.colors.border,
          backgroundColor: `${themeConfig.colors.surface}dd`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold"
                style={{ background: themeConfig.colors.gradient }}
              >
                📡
              </div>
              <div
                className="text-xl font-bold hidden sm:block"
                style={{
                  background: themeConfig.colors.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Broadcaster
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <ThemeSwitcher />
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: themeConfig.colors.primary }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: themeConfig.colors.text }}
                  >
                    {user?.username}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: themeConfig.colors.textSecondary }}
                  >
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 text-white flex items-center gap-2"
                style={{ background: themeConfig.colors.gradient }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{
                color: themeConfig.colors.text,
                backgroundColor: `${themeConfig.colors.primary}10`,
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
              <ThemeSwitcher />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 rounded-lg font-semibold transition-all text-white flex items-center justify-center gap-2"
                style={{ background: themeConfig.colors.gradient }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header Section */}
        <div className="mb-12 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className="text-5xl font-black mb-3"
                style={{ color: themeConfig.colors.text, fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}
              >
                Welcome back, <span style={{ background: themeConfig.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.username}!</span>
              </h1>
              <p
                className="text-lg"
                style={{ color: themeConfig.colors.textSecondary }}
              >
                Manage your Broadcaster platform with ease
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div
          className="rounded-3xl p-8 mb-12 border-2 transition-all hover:border-opacity-80 backdrop-blur-sm"
          style={{
            backgroundColor: `${themeConfig.colors.surface}dd`,
            borderColor: themeConfig.colors.border,
            background: `linear-gradient(135deg, ${themeConfig.colors.surface}dd 0%, ${themeConfig.colors.surfaceLight}aa 100%)`,
            borderRadius: '1.5rem',
            padding: '2rem',
            marginBottom: '3rem',
            border: `2px solid ${themeConfig.colors.border}`,
            boxShadow: `0 10px 30px ${themeConfig.colors.primary}15`,
          }}
        >
          <div className="flex items-center gap-6 mb-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
              style={{ background: themeConfig.colors.gradient }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ color: themeConfig.colors.text }}
              >
                {user?.username}
              </h2>
              <div className="flex items-center gap-4">
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                  style={{
                    backgroundColor: `${themeConfig.colors.primary}20`,
                    color: themeConfig.colors.primary,
                  }}
                >
                  <CheckCircle size={16} />
                  {user?.role}
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: user?.isActive ? `${themeConfig.colors.success}20` : `${themeConfig.colors.error}20`,
                    color: user?.isActive ? themeConfig.colors.success : themeConfig.colors.error,
                  }}
                >
                  {user?.isActive ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Email', value: user?.email || 'N/A', icon: '📧' },
              { label: 'License ID', value: user?.licenseId || 'N/A', icon: '📜' },
              { label: 'Account Status', value: user?.isActive ? 'Active' : 'Inactive', icon: '✅' },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).getFullYear() : 'N/A', icon: '📅' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl transition-all hover:scale-105"
                style={{ backgroundColor: `${themeConfig.colors.primary}10` }}
              >
                <p className="text-2xl mb-1">{stat.icon}</p>
                <p
                  className="text-xs font-semibold mb-1 uppercase tracking-wide"
                  style={{ color: themeConfig.colors.textSecondary }}
                >
                  {stat.label}
                </p>
                <p
                  className="text-sm font-bold"
                  style={{ color: themeConfig.colors.text }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-6">
            <Zap style={{ color: themeConfig.colors.primary }} size={28} />
            <h2
              className="text-3xl font-black"
              style={{ color: themeConfig.colors.text }}
            >
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group cursor-pointer"
                >
                  <div
                    className="p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 backdrop-blur-sm"
                    style={{
                      backgroundColor: `${themeConfig.colors.surface}dd`,
                      borderColor: themeConfig.colors.border,
                      boxShadow: `0 0 20px ${item.color}20`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-12"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon size={28} style={{ color: item.color }} />
                      </div>
                      <span
                        className="text-2xl opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-2"
                        style={{ color: themeConfig.colors.primary }}
                      >
                        →
                      </span>
                    </div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ color: themeConfig.colors.text }}
                    >
                      {item.label}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: themeConfig.colors.textSecondary }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Messaging Section */}
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare style={{ color: themeConfig.colors.primary }} size={28} />
            <h2
              className="text-3xl font-black"
              style={{ color: themeConfig.colors.text }}
            >
              Messaging
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: '📱 WhatsApp', icon: Users, path: '/whatsapp', color: '#25d366', desc: 'Connect & manage accounts' },
              { label: '👥 Contacts', icon: Users, path: '/contacts', color: '#8b5cf6', desc: 'Manage contacts' },
              { label: '📝 Templates', icon: FileText, path: '/templates', color: '#06b6d4', desc: 'Message templates' },
              { label: '🎯 Campaigns', icon: Send, path: '/campaigns', color: '#f59e0b', desc: 'Create campaigns' },
              { label: '📤 Broadcast', icon: Send, path: '/broadcast', color: '#ef4444', desc: 'Send messages' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group cursor-pointer"
                >
                  <div
                    className="p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 backdrop-blur-sm"
                    style={{
                      backgroundColor: `${themeConfig.colors.surface}dd`,
                      borderColor: themeConfig.colors.border,
                      boxShadow: `0 0 15px ${item.color}15`,
                    }}
                  >
                    <div className="text-center">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 transition-all group-hover:scale-110"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon size={20} style={{ color: item.color }} />
                      </div>
                      <h3
                        className="text-sm font-bold mb-1"
                        style={{ color: themeConfig.colors.text }}
                      >
                        {item.label}
                      </h3>
                      <p
                        className="text-xs"
                        style={{ color: themeConfig.colors.textSecondary }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Shield style={{ color: themeConfig.colors.primary }} size={28} />
            <h2
              className="text-3xl font-black"
              style={{ color: themeConfig.colors.text }}
            >
              Platform Features
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm"
                style={{
                  backgroundColor: `${themeConfig.colors.surface}dd`,
                  borderColor: themeConfig.colors.border,
                  boxShadow: `0 0 15px ${themeConfig.colors.primary}10`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-3xl group-hover:scale-125 transition-transform duration-300">{feature.emoji}</p>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{
                      backgroundColor: `${themeConfig.colors.primary}20`,
                      color: themeConfig.colors.primary,
                    }}
                  >
                    {feature.category}
                  </span>
                </div>
                <h3
                  className="font-bold text-lg mb-2 group-hover:translate-x-1 transition-transform"
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

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
