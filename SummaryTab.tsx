import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';
import { ModernCard, Icons } from './ModernUI';

const SummaryTab = () => {
  const { summaryData } = useAppState();
  // Use our custom theme hook for consistent theming
  const { isDarkMode, colors } = useTheme();

  const styles = StyleSheet.create({
    tabContent: { padding: 20, flex: 1, backgroundColor: colors.backgroundSecondary },
    summaryItem: { 
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.borderLight
    },
    summaryName: { 
      fontSize: 18, 
      fontWeight: '700', 
      color: colors.text, 
      marginBottom: 16,
      letterSpacing: -0.3,
      flexDirection: 'row',
      alignItems: 'center'
    },
    summaryDetails: { marginTop: 8 },
    summaryRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8
    },
    summaryLabel: { 
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary 
    },
    summaryValue: { 
      fontSize: 16,
      fontWeight: '600',
      color: colors.text 
    },
    summaryBalance: { fontWeight: '700', fontSize: 18 },
    positiveBalance: { color: colors.success },
    negativeBalance: { color: colors.error },
    emptyMessage: { 
      textAlign: 'center', 
      padding: 24, 
      color: colors.textSecondary, 
      fontSize: 16, 
      fontWeight: '500' 
    },
    balanceCard: {
      marginTop: 8,
      padding: 16,
      borderRadius: 12,
      borderWidth: 2
    },
    positiveBalanceCard: {
      backgroundColor: colors.successLight + '20',
      borderColor: colors.success
    },
    negativeBalanceCard: {
      backgroundColor: colors.errorLight + '20',
      borderColor: colors.error
    }
  });

  return (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={true}
    >
      {Object.keys(summaryData).length > 0 ? (
        Object.keys(summaryData).map((mate) => {
          const isPositive = summaryData[mate].balance >= 0;
          return (
            <ModernCard key={mate} style={styles.summaryItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Icons.User />
                <Text style={[styles.summaryName, { marginLeft: 12, marginBottom: 0 }]}>{mate}</Text>
              </View>
              
              <View style={styles.summaryDetails}>
                <View style={styles.summaryRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icons.Money />
                    <Text style={[styles.summaryLabel, { marginLeft: 8 }]}>Paid:</Text>
                  </View>
                  <Text style={styles.summaryValue}>₹{summaryData[mate].paid.toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14 }}>💸</Text>
                    <Text style={[styles.summaryLabel, { marginLeft: 8 }]}>Owes:</Text>
                  </View>
                  <Text style={styles.summaryValue}>₹{summaryData[mate].owes.toFixed(2)}</Text>
                </View>
                
                <View style={[
                  styles.balanceCard,
                  isPositive ? styles.positiveBalanceCard : styles.negativeBalanceCard
                ]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16 }}>{isPositive ? '₹' : '🔴'}</Text>
                      <Text style={[styles.summaryLabel, { marginLeft: 8, fontSize: 16, fontWeight: '600' }]}>Balance:</Text>
                    </View>
                    <Text
                      style={[
                        styles.summaryValue,
                        styles.summaryBalance,
                        isPositive ? styles.positiveBalance : styles.negativeBalance,
                      ]}
                    >
                      {isPositive ? '+' : ''}₹{summaryData[mate].balance.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 12,
                    color: colors.textTertiary,
                    marginTop: 4,
                    textAlign: 'center'
                  }}>
                    {isPositive ? 'Should receive' : 'Should pay'}
                  </Text>
                </View>
              </View>
            </ModernCard>
          );
        })
      ) : (
        <ModernCard style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>📊</Text>
          <Text style={styles.emptyMessage}>No summary available</Text>
          <Text style={[styles.emptyMessage, { fontSize: 14, marginTop: 8 }]}>Add friends and expenses to see the summary!</Text>
        </ModernCard>
      )}
    </ScrollView>
  );
};

export default SummaryTab; 