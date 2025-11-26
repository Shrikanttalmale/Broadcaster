import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/auth.service';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { themeConfig } = useTheme();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!username || !password) {
        setError(t('login.invalidCredentials'));
        setLoading(false);
        return;
      }

      await authService.login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.invalidCredentials'));
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 overflow-hidden"
      style={{
        background: themeConfig.colors.background,
      }}
    >
      {/* Animated background shapes - Premium effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30 blur-3xl animate-pulse"
          style={{ background: themeConfig.colors.primary }}
        ></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: themeConfig.colors.accent, animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse"
          style={{ background: themeConfig.colors.warning, animationDelay: '2s' }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-3xl shadow-2xl p-10 backdrop-blur-xl border-2 transition-all duration-300 hover:shadow-3xl"
          style={{
            backgroundColor: `${themeConfig.colors.surface}dd`,
            borderColor: themeConfig.colors.border,
            background: `linear-gradient(135deg, ${themeConfig.colors.surface}dd 0%, ${themeConfig.colors.surfaceLight}99 100%)`,
          }}
        >
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in">
            <div
              className="inline-block px-6 py-3 rounded-2xl mb-6 shadow-lg transform hover:scale-110 transition-transform"
              style={{
                background: themeConfig.colors.gradient,
              }}
            >
              <h1
                className="text-4xl font-black"
                style={{ color: '#fff' }}
              >
                📡
              </h1>
            </div>
            <h2
              className="text-3xl font-black mb-2"
              style={{ color: themeConfig.colors.text }}
            >
              Broadcaster
            </h2>
            <p
              className="text-sm font-semibold"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              {t('app.tagline')}
            </p>
          </div>

          {/* Theme Switcher */}
          <div className="mb-8 flex justify-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <ThemeSwitcher />
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="p-4 rounded-xl mb-8 border-l-4 transition-all duration-300 animate-fade-in"
              style={{
                backgroundColor: `${themeConfig.colors.error}20`,
                borderLeftColor: themeConfig.colors.error,
                color: themeConfig.colors.error,
              }}
            >
              <p className="font-bold flex items-center gap-2">
                <span>⚠️</span> {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username */}
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <label
                className="block text-sm font-bold mb-3 transition-colors uppercase tracking-wide"
                style={{ color: themeConfig.colors.text }}
              >
                👤 {t('login.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border-2 font-medium transition-all duration-200 focus:outline-none transform focus:scale-105"
                style={{
                  borderColor: themeConfig.colors.border,
                  backgroundColor: themeConfig.colors.surfaceLight,
                  color: themeConfig.colors.text,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = themeConfig.colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${themeConfig.colors.primary}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = themeConfig.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                placeholder="Enter username"
              />
            </div>

            {/* Password */}
            <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <label
                className="block text-sm font-bold mb-3 transition-colors uppercase tracking-wide"
                style={{ color: themeConfig.colors.text }}
              >
                🔐 {t('login.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3 pr-12 rounded-xl border-2 font-medium transition-all duration-200 focus:outline-none"
                  style={{
                    borderColor: themeConfig.colors.border,
                    backgroundColor: themeConfig.colors.surfaceLight,
                    color: themeConfig.colors.text,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = themeConfig.colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${themeConfig.colors.primary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = themeConfig.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: themeConfig.colors.textSecondary }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 text-white transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl animate-fade-in"
              style={{
                background: themeConfig.colors.gradient,
                animationDelay: '0.4s'
              }}
            >
              {loading ? '⏳ Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div
            className="my-8 flex items-center gap-4"
            style={{ color: themeConfig.colors.textSecondary }}
          >
            <div className="flex-1 h-px" style={{ backgroundColor: themeConfig.colors.border }}></div>
            <span className="text-xs font-semibold">OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: themeConfig.colors.border }}></div>
          </div>

          {/* Demo Info */}
          <div
            className="p-4 rounded-xl mb-6 text-center"
            style={{ backgroundColor: `${themeConfig.colors.primary}10` }}
          >
            <p
              className="text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              Demo Credentials
            </p>
            <p
              className="font-mono font-bold"
              style={{ color: themeConfig.colors.primary }}
            >
              admin / password
            </p>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t text-center" style={{ borderColor: themeConfig.colors.border }}>
            <p
              className="text-sm mb-4"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              {t('login.noAccount')}{' '}
              <button
                onClick={handleRegisterClick}
                className="font-bold transition-colors hover:opacity-80"
                style={{ color: themeConfig.colors.primary }}
              >
                {t('login.signup')}
              </button>
            </p>
            <p
              className="text-xs"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              © 2024 Broadcaster. All rights reserved.
            </p>
          </div>
        </div>
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
        
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
}
