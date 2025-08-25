import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';

const SettlementsTab = () => {
  const { settlements } = useAppState();
  // Use our custom theme hook for consistent theming
  const { isDarkMode, colors } = useTheme();

  const styles = StyleSheet.create({
    tabContent: { padding: 16, flex: 1 },
    settlementText: {
      fontSize: 14,
      color: colors.text,
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

  return (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={true}
    >
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
    </ScrollView>
  );
};

export default SettlementsTab;
