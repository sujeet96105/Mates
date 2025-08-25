import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';

const SummaryTab = () => {
  const { summaryData } = useAppState();
  // Use our custom theme hook for consistent theming
  const { isDarkMode, colors } = useTheme();

  const styles = StyleSheet.create({
    tabContent: { padding: 16, flex: 1 },
    summaryItem: { borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingVertical: 12 },
    summaryName: { fontSize: 16, fontWeight: '600', color: colors.text },
    summaryDetails: { marginLeft: 8, marginTop: 4 },
    summaryRow: { flexDirection: 'row', marginBottom: 2 },
    summaryLabel: { width: 60, color: colors.textSecondary },
    summaryValue: { color: colors.text },
    summaryBalance: { fontWeight: '600' },
    positiveBalance: { color: colors.success },
    negativeBalance: { color: colors.error },
    emptyMessage: { textAlign: 'center', padding: 16, color: colors.textSecondary },
  });

  return (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={true}
    >
      {Object.keys(summaryData).length > 0 ? (
        Object.keys(summaryData).map((mate) => (
          <View key={mate} style={styles.summaryItem}>
            <Text style={styles.summaryName}>{mate}</Text>
            <View style={styles.summaryDetails}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Paid:</Text>
                <Text style={styles.summaryValue}>₹{summaryData[mate].paid.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Owes:</Text>
                <Text style={styles.summaryValue}>₹{summaryData[mate].owes.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Balance:</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    styles.summaryBalance,
                    summaryData[mate].balance >= 0 ? styles.positiveBalance : styles.negativeBalance,
                  ]}
                >
                  ₹{summaryData[mate].balance.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyMessage}>No roommates or expenses to show summary for.</Text>
      )}
    </ScrollView>
  );
};

export default SummaryTab; 