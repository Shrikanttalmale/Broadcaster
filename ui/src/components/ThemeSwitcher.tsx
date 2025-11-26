import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../types/theme';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, availableThemes } = useTheme();

  const themeLabels: Record<Theme, string> = {
    light: '☀️ Light',
    dark: '🌙 Dark',
    ocean: '🌊 Ocean',
    forest: '🌲 Forest',
    sunset: '🌅 Sunset',
    cyberpunk: '⚡ Cyberpunk',
    minimal: '📐 Minimal',
    aurora: '🌌 Aurora',
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="px-3 py-2 rounded-lg border-2 cursor-pointer transition-all"
        style={{
          borderColor: 'var(--color-primary)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      >
        {availableThemes.map((t) => (
          <option key={t} value={t}>
            {themeLabels[t]}
          </option>
        ))}
      </select>
    </div>
  );
};
