import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text, ScrollView } from 'react-native';
import Share from 'react-native-share';
import { useTheme } from './useTheme';
import { useAuth } from './AuthProvider';
import UserProfile from './UserProfile';
import { useAppState } from './AppStateProvider';
import { db } from './firebase';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { exportExpensesToPdf } from './pdfExport_clean';

const SettingsTab = () => {
  // Use our custom theme hook for consistent theming
  const { colors } = useTheme();
  const { deleteAccount, isLoading } = useAuth();
  const { expenses, settlements } = useAppState();
  const [isExporting, setIsExporting] = useState(false);
  
  const styles = StyleSheet.create({
    tabContent: { 
      flex: 1,
      backgroundColor: colors.background
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 48,
      gap: 16
    },
    
    
    spacer: {
      height: 32
    },
    spacerLarge: {
      height: 40
    }
  });

  const handleExportAndClear = useCallback(async () => {}, []);

  const handleDeleteAccount = useCallback(() => {}, []);

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentContainer}>
      <UserProfile />
    </ScrollView>
  );
};

export default SettingsTab;