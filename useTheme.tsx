import { useColorScheme } from 'react-native';

export interface Theme {
  isDarkMode: boolean;
  colors: {
    primary: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    textPlaceholder: string;
    inputBackground: string;
    border: string;
    borderLight: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    accent: string;
    buttonPrimary: string;
    buttonSecondary: string;
    shadow: string;
  };
}

export const useTheme = (): Theme => {
  // Force dark mode across the app regardless of system setting
  const isDarkMode = true;

  // Vibrant dark palette for attractive UI/UX
  const darkTheme = {
    primary: '#F97316',          // Orange 500
    background: '#0B1220',       // Deep navy
    surface: '#111827',          // Gray 900
    card: '#0F172A',             // Slate 900
    text: '#E5E7EB',             // Gray 200
    textSecondary: '#9CA3AF',    // Gray 400
    textPlaceholder: '#6B7280',  // Gray 500
    inputBackground: '#0B1220',  // Match background for inputs
    border: '#334155',           // Slate 700
    borderLight: '#1F2937',      // Gray 800
    success: '#34D399',          // Emerald 400
    error: '#F87171',            // Red 400
    warning: '#FBBF24',          // Amber 400
    info: '#60A5FA',             // Blue 400
    accent: '#FDBA74',           // Orange 300
    buttonPrimary: '#F97316',    // Orange 500
    buttonSecondary: '#1F2937',  // Gray 800
    shadow: '#000000',
  };

  return {
    isDarkMode,
    colors: darkTheme,
  };
};
