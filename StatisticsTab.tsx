import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';

const StatisticsTab = () => {
  const { generateExpenseStats } = useAppState();
  // Use our custom theme hook for consistent theming
  const { isDarkMode, colors } = useTheme();
  
  const expenseStats = generateExpenseStats();

  const styles = StyleSheet.create({
    tabContent: { padding: 16, flex: 1 },
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
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    emptyMessage: {
      textAlign: 'center',
      padding: 16,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.tabContent}>
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
              <Text style={styles.statValue}>
                ₹{expenseStats.highest.amount.toFixed(2)} - {expenseStats.highest.description}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Average Per Roommate:</Text>
              <Text style={styles.statValue}>₹{expenseStats.averagePerRoommate.toFixed(2)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Categories:</Text>
              <View>
                {Object.keys(expenseStats.byCategory).map((category) => (
                  <Text key={category} style={styles.statValue}>
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
    </View>
  );
};

export default StatisticsTab;
