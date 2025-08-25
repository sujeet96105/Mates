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
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const lightTheme = {
    primary: '#4F46E5',
    background: '#f5f5f5',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    textPlaceholder: '#9CA3AF',
    border: '#ccc',
    borderLight: '#eee',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    accent: '#8B5CF6',
    buttonPrimary: '#4F46E5',
    buttonSecondary: '#E5E7EB',
    shadow: '#000',
  };

  const darkTheme = {
    primary: '#4F46E5',
    background: '#121212',
    surface: '#1E1E1E',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#A1A1A1',
    textPlaceholder: '#9CA3AF',
    border: '#333',
    borderLight: '#333',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    accent: '#8B5CF6',
    buttonPrimary: '#4F46E5',
    buttonSecondary: '#2A2A2A',
    shadow: '#000',
  };

  return {
    isDarkMode,
    colors: isDarkMode ? darkTheme : lightTheme,
  };
};
