import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export interface Theme {
  isDarkMode: boolean;
  colors: {
    // Primary brand colors
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    
    // Background colors
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceElevated: string;
    card: string;
    cardElevated: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;
    textPlaceholder: string;
    textOnPrimary: string;
    textOnSecondary: string;
    
    // Border colors
    border: string;
    borderLight: string;
    borderFocus: string;
    
    // Status colors
    success: string;
    successLight: string;
    error: string;
    errorLight: string;
    warning: string;
    warningLight: string;
    info: string;
    infoLight: string;
    
    // Button colors
    buttonPrimary: string;
    buttonPrimaryPressed: string;
    buttonSecondary: string;
    buttonSecondaryPressed: string;
    buttonTertiary: string;
    buttonTertiaryPressed: string;
    
    // Special colors
    shadow: string;
    overlay: string;
    shimmer: string;
    
    // Gradient colors
    gradientPrimary: string[];
    gradientSecondary: string[];
    gradientCard: string[];
  };
}

export const useTheme = (): Theme => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return useMemo(() => {
  // Modern color palette
  const brandColors = {
    // Primary gradient - Modern purple to blue
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
    purpleDark: '#7C3AED',
    blue: '#3B82F6',
    blueLight: '#60A5FA',
    blueDark: '#2563EB',
    
    // Secondary colors - Warm accent
    orange: '#F59E0B',
    orangeLight: '#FCD34D',
    orangeDark: '#D97706',
    
    // Success colors
    green: '#10B981',
    greenLight: '#34D399',
    
    // Error colors
    red: '#EF4444',
    redLight: '#F87171',
    
    // Warning colors
    yellow: '#F59E0B',
    yellowLight: '#FCD34D',
    
    // Info colors
    cyan: '#06B6D4',
    cyanLight: '#67E8F9',
  };

  const lightTheme = {
    // Primary brand colors
    primary: brandColors.purple,
    primaryLight: brandColors.purpleLight,
    primaryDark: brandColors.purpleDark,
    secondary: brandColors.orange,
    accent: brandColors.blue,
    
    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    
    // Text colors
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textPlaceholder: '#D1D5DB',
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#FFFFFF',
    
    // Border colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderFocus: brandColors.purple,
    
    // Status colors
    success: brandColors.green,
    successLight: brandColors.greenLight,
    error: brandColors.red,
    errorLight: brandColors.redLight,
    warning: brandColors.yellow,
    warningLight: brandColors.yellowLight,
    info: brandColors.cyan,
    infoLight: brandColors.cyanLight,
    
    // Button colors
    buttonPrimary: brandColors.purple,
    buttonPrimaryPressed: brandColors.purpleDark,
    buttonSecondary: '#F3F4F6',
    buttonSecondaryPressed: '#E5E7EB',
    buttonTertiary: 'transparent',
    buttonTertiaryPressed: '#F3F4F6',
    
    // Special colors
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shimmer: '#F3F4F6',
    
    // Gradient colors
    gradientPrimary: [brandColors.purple, brandColors.blue],
    gradientSecondary: [brandColors.orange, brandColors.yellow],
    gradientCard: ['#FFFFFF', '#F8FAFC'],
  };

  const darkTheme = {
    // Primary brand colors
    primary: brandColors.purpleLight,
    primaryLight: '#C4B5FD',
    primaryDark: brandColors.purple,
    secondary: brandColors.orangeLight,
    accent: brandColors.blueLight,
    
    // Background colors
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    card: '#1E293B',
    cardElevated: '#334155',
    
    // Text colors
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textPlaceholder: '#64748B',
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#FFFFFF',
    
    // Border colors
    border: '#334155',
    borderLight: '#475569',
    borderFocus: brandColors.purpleLight,
    
    // Status colors
    success: brandColors.greenLight,
    successLight: '#6EE7B7',
    error: brandColors.redLight,
    errorLight: '#FCA5A5',
    warning: brandColors.yellowLight,
    warningLight: '#FDE68A',
    info: brandColors.cyanLight,
    infoLight: '#A7F3D0',
    
    // Button colors
    buttonPrimary: brandColors.purpleLight,
    buttonPrimaryPressed: brandColors.purple,
    buttonSecondary: '#334155',
    buttonSecondaryPressed: '#475569',
    buttonTertiary: 'transparent',
    buttonTertiaryPressed: '#334155',
    
    // Special colors
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shimmer: '#334155',
    
    // Gradient colors
    gradientPrimary: [brandColors.purpleLight, brandColors.blueLight],
    gradientSecondary: [brandColors.orangeLight, brandColors.yellowLight],
    gradientCard: ['#1E293B', '#334155'],
  };

    return {
      isDarkMode,
      colors: isDarkMode ? darkTheme : lightTheme,
    };
  }, [isDarkMode]);
};
