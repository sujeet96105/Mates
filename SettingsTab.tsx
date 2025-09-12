import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import UserProfile from './UserProfile';

const SettingsTab = () => {
  // Use our custom theme hook for consistent theming
  const { colors } = useTheme();
  
  const styles = StyleSheet.create({
    tabContent: { 
      padding: 16, 
      flex: 1,
      backgroundColor: colors.background
    },
  });

  return (
    <View style={styles.tabContent}>
      <UserProfile />
    </View>
  );
};

export default SettingsTab;