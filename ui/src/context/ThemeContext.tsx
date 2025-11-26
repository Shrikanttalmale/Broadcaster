import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeConfig, THEME_CONFIGS } from '../types/theme';

interface ThemeContextType {
  theme: Theme;
  themeConfig: ThemeConfig;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('broadcaster-theme');
    return (saved as Theme) || 'light';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('broadcaster-theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    const colors = THEME_CONFIGS[theme].colors;

    // Set CSS variables for global access
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Set data attribute for theme
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeConfig: THEME_CONFIGS[theme],
        setTheme,
        availableThemes: Object.keys(THEME_CONFIGS) as Theme[],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
