import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { licenseService, authService } from '../services/auth.service';
import { ArrowLeft, Plus, LogOut, Eye, Trash2 } from 'lucide-react';

interface License {
  id: string;
  key: string;
  type: string;
  expiryDate: string;
  isActive: boolean;
  features: string[];
  createdAt: string;
}

export default function LicensesPage() {
  const navigate = useNavigate();
  const { themeConfig } = useTheme();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    type: 'user',
    expiryDays: 365,
    features: ['multi_account', 'campaigns', 'templates'],
  });

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const data = await licenseService.getLicenses();
      setLicenses(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch licenses' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await licenseService.generateLicense(formData);
      setMessage({ type: 'success', text: 'License generated successfully' });
      setShowForm(false);
      setFormData({
        type: 'user',
        expiryDays: 365,
        features: ['multi_account', 'campaigns', 'templates'],
      });
      fetchLicenses();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create license' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this license?')) {
      try {
        await licenseService.deleteLicense(id);
        setMessage({ type: 'success', text: 'License deleted successfully' });
        fetchLicenses();
      } catch (err: any) {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete license' });
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

  const licenseTypes = ['master', 'distributor', 'user'];
  const availableFeatures = ['multi_account', 'campaigns', 'templates', 'analytics', 'white_label'];

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: themeConfig.colors.text }}
            >
              📜 License Management
            </h1>
            <p
              className="text-lg"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              Generate, view, and manage licenses
            </p>
          </div>
          <button
            onClick={() => {
              setFormData({
                type: 'user',
                expiryDays: 365,
                features: ['multi_account', 'campaigns', 'templates'],
              });
              setShowForm(!showForm);
            }}
            className="px-6 py-3 rounded-lg font-bold text-white transition-all transform hover:scale-105 flex items-center gap-2"
            style={{ background: themeConfig.colors.gradient }}
          >
            <Plus size={20} />
            Generate License
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className="p-4 rounded-lg mb-6 border-l-4 transition-all"
            style={{
              backgroundColor: `${message.type === 'success' ? themeConfig.colors.success : themeConfig.colors.error}20`,
              borderLeftColor: message.type === 'success' ? themeConfig.colors.success : themeConfig.colors.error,
              color: message.type === 'success' ? themeConfig.colors.success : themeConfig.colors.error,
            }}
          >
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
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
              Generate New License
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: themeConfig.colors.text }}
                  >
                    License Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: themeConfig.colors.border,
                      backgroundColor: themeConfig.colors.surfaceLight,
                      color: themeConfig.colors.text,
                    }}
                  >
                    {licenseTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: themeConfig.colors.text }}
                  >
                    Expiry (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.expiryDays}
                    onChange={(e) => setFormData({ ...formData, expiryDays: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: themeConfig.colors.border,
                      backgroundColor: themeConfig.colors.surfaceLight,
                      color: themeConfig.colors.text,
                    }}
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: themeConfig.colors.text }}
                >
                  Features
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableFeatures.map((feature) => (
                    <label key={feature} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              features: [...formData.features, feature],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              features: formData.features.filter((f) => f !== feature),
                            });
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span style={{ color: themeConfig.colors.text }}>{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg font-bold text-white transition-all"
                  style={{ background: themeConfig.colors.gradient }}
                >
                  Generate License
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

        {/* Licenses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div style={{ color: themeConfig.colors.text }}>⏳ Loading licenses...</div>
          ) : licenses.length === 0 ? (
            <div style={{ color: themeConfig.colors.textSecondary }}>No licenses found</div>
          ) : (
            licenses.map((license) => (
              <div
                key={license.id}
                className="rounded-xl p-5 border-2 transition-all hover:-translate-y-1"
                style={{
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: themeConfig.colors.border,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="font-bold text-lg"
                    style={{ color: themeConfig.colors.text }}
                  >
                    {license.type.toUpperCase()}
                  </h3>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: `${license.isActive ? themeConfig.colors.success : themeConfig.colors.error}20`,
                      color: license.isActive ? themeConfig.colors.success : themeConfig.colors.error,
                    }}
                  >
                    {license.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p
                  className="text-sm mb-2 truncate"
                  style={{ color: themeConfig.colors.textSecondary }}
                >
                  Key: {license.key.substring(0, 20)}...
                </p>
                <p
                  className="text-sm mb-3"
                  style={{ color: themeConfig.colors.textSecondary }}
                >
                  Expires: {new Date(license.expiryDate).toLocaleDateString()}
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: themeConfig.colors.textSecondary }}
                >
                  Features: {license.features.join(', ')}
                </p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 rounded-lg transition-all text-white text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: themeConfig.colors.gradient }}
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(license.id)}
                    className="px-3 py-2 rounded-lg transition-all text-sm font-semibold"
                    style={{
                      backgroundColor: `${themeConfig.colors.error}20`,
                      color: themeConfig.colors.error,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
