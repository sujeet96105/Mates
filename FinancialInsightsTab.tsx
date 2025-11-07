import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';
import { ModernCard, ModernButton, Icons } from './ModernUI';
import NativeAdCard from './components/ads/NativeAdCard';
import { ANDROID_NATIVE_AD_UNIT_ID_STATISTICS, ANDROID_NATIVE_AD_UNIT_ID_SETTLEMENTS, IOS_NATIVE_AD_UNIT_ID_STATISTICS, IOS_NATIVE_AD_UNIT_ID_SETTLEMENTS } from './adConfig';

const FinancialInsightsTab = () => {
  const { settlements, generateExpenseStats, activeTab } = useAppState();
  const { isDarkMode, colors } = useTheme();
  const [activeSection, setActiveSection] = useState('statistics'); // 'statistics' or 'settlements'
  
  const expenseStats = generateExpenseStats();

  const styles = StyleSheet.create({
    tabContent: {
      padding: 20,
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    sectionToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 20,
      padding: 6,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sectionButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      minWidth: 100,
      borderRadius: 12,
    },
    activeSection: {
      backgroundColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionText: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    activeSectionText: {
      color: colors.textOnPrimary,
    },
    // Statistics styles
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      flexWrap: 'wrap',
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
      marginRight: 8,
      fontWeight: '500',
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
      flexShrink: 1,
    },
    // Settlements styles
    settlementText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
    },
    debtorName: {
      color: colors.error,
      fontWeight: '700',
    },
    creditorName: {
      color: colors.success,
      fontWeight: '700',
    },
    settlementAmount: {
      color: colors.primary,
      fontWeight: '700',
    },
    emptyMessage: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 24,
      fontSize: 16,
      fontWeight: '500',
    },
  });

  const adUnitIdStats = Platform.select({ android: ANDROID_NATIVE_AD_UNIT_ID_STATISTICS, ios: IOS_NATIVE_AD_UNIT_ID_STATISTICS }) || ANDROID_NATIVE_AD_UNIT_ID_STATISTICS;
  const adUnitIdSettlements = Platform.select({ android: ANDROID_NATIVE_AD_UNIT_ID_SETTLEMENTS, ios: IOS_NATIVE_AD_UNIT_ID_SETTLEMENTS }) || ANDROID_NATIVE_AD_UNIT_ID_SETTLEMENTS;

  const renderStatistics = () => (
    <>
      <ModernCard style={styles.card}>
        <Text style={styles.cardTitle}>Expense Statistics</Text>
        {expenseStats.total > 0 ? (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Expenses:</Text>
              <Text style={styles.statValue}>₹{expenseStats.total.toFixed(2)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Highest Expense:</Text>
              <Text style={styles.statValue} numberOfLines={2} ellipsizeMode="tail">
                ₹{expenseStats.highest.amount.toFixed(2)} - {expenseStats.highest.description}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyMessage}>No expenses to analyze yet.</Text>
        )}
      </ModernCard>
      <NativeAdCard adUnitId={adUnitIdStats} visible={activeTab === 'financialInsights' && activeSection === 'statistics'} />
    </>
  );

  const renderSettlements = () => (
    <>
      <ModernCard style={styles.card}>
        <Text style={styles.cardTitle}>Settlements</Text>
        {settlements.length > 0 ? (
          settlements.map((item) => {
            if ('text' in item) {
              return (
                <Text key={item.key} style={styles.settlementText}>
                  {item.text}
                </Text>
              );
            } else {
              return (
                <Text key={item.key} style={styles.settlementText}>
                  <Text style={styles.debtorName}>{item.from}</Text> pays <Text style={styles.creditorName}>{item.to}</Text> ₹{item.amount.toFixed(2)}
                </Text>
              );
            }
          })
        ) : (
          <Text style={styles.emptyMessage}>No settlements needed at this time</Text>
        )}
      </ModernCard>
      <NativeAdCard adUnitId={adUnitIdSettlements} visible={activeTab === 'financialInsights' && activeSection === 'settlements'} />
    </>
  );

  return (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.sectionToggle}>
        <TouchableOpacity 
          style={[styles.sectionButton, activeSection === 'statistics' && styles.activeSection]}
          onPress={() => setActiveSection('statistics')}
        >
          <Text style={[styles.sectionText, activeSection === 'statistics' && styles.activeSectionText]}>Statistics</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sectionButton, activeSection === 'settlements' && styles.activeSection]}
          onPress={() => setActiveSection('settlements')}
        >
          <Text style={[styles.sectionText, activeSection === 'settlements' && styles.activeSectionText]}>Settlements</Text>
        </TouchableOpacity>
      </View>
      
      {activeSection === 'statistics' ? renderStatistics() : renderSettlements()}
    </ScrollView>
  );
};

export default FinancialInsightsTab;