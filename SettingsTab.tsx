import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import Share from 'react-native-share';
import { useTheme } from './useTheme';
import { useAuth } from './AuthProvider';
import UserProfile from './UserProfile';
import { useAppState } from './AppStateProvider';
import { db } from './firebase';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { exportExpensesToPdf } from './pdfExport_clean';
import { useBubbleSettings } from './useBubbleSettings';

const SettingsTab = () => {
  const { colors } = useTheme();
  const { deleteAccount, isLoading } = useAuth();
  const { expenses, settlements } = useAppState();
  const [isExporting, setIsExporting] = useState(false);

  // Floating bubble toggle
  const {
    bubbleEnabled,
    onToggle: onBubbleToggle,
    isLoading: bubbleLoading,
  } = useBubbleSettings();

  const styles = StyleSheet.create({
    tabContent: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 48,
      gap: 16,
    },

    // ── Setting row card ────────────────────────────────────────────────
    settingCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingTextBlock: {
      flex: 1,
      marginRight: 12,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 4,
      marginTop: 8,
      marginLeft: 4,
    },

    spacer: {
      height: 32,
    },
    spacerLarge: {
      height: 40,
    },
  });

  const handleExportAndClear = useCallback(async () => {}, []);
  const handleDeleteAccount = useCallback(() => {}, []);

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentContainer}>
      {/* Profile section */}
      <UserProfile />

      {/* ── Features ───────────────────────────────────────────────────── */}
      <Text style={styles.sectionHeader}>Features</Text>

      {/* Floating bubble toggle */}
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextBlock}>
            <Text style={styles.settingTitle}>💬  Floating Quick-Add Bubble</Text>
            <Text style={styles.settingDescription}>
              Add expenses instantly without opening the app.
              {Platform.OS === 'android'
                ? '\nRequires "Display over other apps" permission.'
                : ''}
            </Text>
          </View>
          {bubbleLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={bubbleEnabled}
              onValueChange={onBubbleToggle}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={bubbleEnabled ? colors.primary : colors.surface}
              ios_backgroundColor={colors.border}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default SettingsTab;