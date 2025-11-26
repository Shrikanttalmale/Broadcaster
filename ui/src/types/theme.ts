export type Theme = 'light' | 'dark' | 'ocean' | 'forest' | 'sunset' | 'cyberpunk' | 'minimal' | 'aurora';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  gradient: string;
}

export interface ThemeConfig {
  name: Theme;
  colors: ThemeColors;
  isDark: boolean;
}

export const THEME_CONFIGS: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    isDark: false,
    colors: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#60a5fa',
      background: '#ffffff',
      surface: '#f9fafb',
      surfaceLight: '#f3f4f6',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    },
  },
  dark: {
    name: 'dark',
    isDark: true,
    colors: {
      primary: '#60a5fa',
      secondary: '#93c5fd',
      accent: '#bfdbfe',
      background: '#0f172a',
      surface: '#1e293b',
      surfaceLight: '#334155',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      border: '#475569',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      gradient: 'linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%)',
    },
  },
  ocean: {
    name: 'ocean',
    isDark: true,
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#22d3ee',
      background: '#082f49',
      surface: '#0c4a6e',
      surfaceLight: '#0e7490',
      text: '#ecf0f1',
      textSecondary: '#cbd5e1',
      border: '#164e63',
      success: '#06d6a0',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #06d6a0 100%)',
    },
  },
  forest: {
    name: 'forest',
    isDark: true,
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#34d399',
      background: '#064e3b',
      surface: '#047857',
      surfaceLight: '#059669',
      text: '#ecfdf5',
      textSecondary: '#d1fae5',
      border: '#10b981',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#f87171',
      info: '#06b6d4',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)',
    },
  },
  sunset: {
    name: 'sunset',
    isDark: true,
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fb923c',
      background: '#431407',
      surface: '#7c2d12',
      surfaceLight: '#92400e',
      text: '#fef3c7',
      textSecondary: '#fcd34d',
      border: '#f97316',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#3b82f6',
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #eab308 100%)',
    },
  },
  cyberpunk: {
    name: 'cyberpunk',
    isDark: true,
    colors: {
      primary: '#d946ef',
      secondary: '#c026d3',
      accent: '#e879f9',
      background: '#0a0e27',
      surface: '#1a1a3e',
      surfaceLight: '#2d2d5f',
      text: '#f0f0ff',
      textSecondary: '#c7c7e0',
      border: '#d946ef',
      success: '#06d6a0',
      warning: '#fbbf24',
      error: '#ff006e',
      info: '#00d9ff',
      gradient: 'linear-gradient(135deg, #d946ef 0%, #c026d3 50%, #00d9ff 100%)',
    },
  },
  minimal: {
    name: 'minimal',
    isDark: true,
    colors: {
      primary: '#64748b',
      secondary: '#475569',
      accent: '#94a3b8',
      background: '#0f172a',
      surface: '#1e293b',
      surfaceLight: '#334155',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      border: '#475569',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      info: '#3b82f6',
      gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    },
  },
  aurora: {
    name: 'aurora',
    isDark: true,
    colors: {
      primary: '#3b82f6',
      secondary: '#06b6d4',
      accent: '#10b981',
      background: '#0f172a',
      surface: '#1e293b',
      surfaceLight: '#334155',
      text: '#f0f9ff',
      textSecondary: '#cbd5e1',
      border: '#0e7490',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)',
    },
  },
};
