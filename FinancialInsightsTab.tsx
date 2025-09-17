import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';

const FinancialInsightsTab = () => {
  const { settlements, generateExpenseStats } = useAppState();
  const { isDarkMode, colors } = useTheme();
  const [activeSection, setActiveSection] = useState('statistics'); // 'statistics' or 'settlements'
  
  const expenseStats = generateExpenseStats();

  const styles = StyleSheet.create({
    tabContent: { 
      padding: 16, 
      flex: 1 
    },
    sectionToggle: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: 16,
      overflow: 'hidden',
      width: '100%',
    },
    sectionButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      minWidth: 100,
    },
    activeSection: {
      backgroundColor: colors.primary,
    },
    sectionText: {
      color: colors.textSecondary,
      fontWeight: '500',
    },
    activeSectionText: {
      color: isDarkMode ? colors.text : '#FFFFFF',
    },
    // Statistics styles
    card: { 
      backgroundColor: colors.card, 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 16, 
      shadowColor: colors.shadow, 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.2, 
      shadowRadius: 4, 
      elevation: 4 
    },
    cardTitle: { 
      fontSize: 18, 
      fontWeight: '600', 
      color: colors.text, 
      marginBottom: 12 
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      flexWrap: 'wrap',
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
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
      fontWeight: '600',
    },
    creditorName: {
      color: colors.success,
      fontWeight: '600',
    },
    settlementAmount: {
      color: colors.primary,
      fontWeight: '600',
    },
    emptyMessage: {
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 24,
    },
  });

  const renderStatistics = () => (
    <View style={styles.card}>
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
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average Per Roommate:</Text>
            <Text style={styles.statValue}>₹{expenseStats.averagePerRoommate.toFixed(2)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Categories:</Text>
            <View style={{flex: 1}}>
              {Object.keys(expenseStats.byCategory).map((category) => (
                <Text key={category} style={[styles.statValue, {textAlign: 'left', marginTop: 2}]}>
                  {category}: ₹{expenseStats.byCategory[category].toFixed(2)}
                </Text>
              ))}
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.emptyMessage}>No expenses to analyze yet.</Text>
      )}
    </View>
  );

  const renderSettlements = () => (
    <View style={styles.card}>
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
    </View>
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