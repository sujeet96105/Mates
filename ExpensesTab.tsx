import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';

const ExpensesTab = () => {
  const {
    isLoading,
    categoryFilter,
    setCategoryFilter,
    categories,
    dateRange,
    setDateRange,
    openDatePicker,
    newExpense,
    setNewExpense,
    roommates,
    handleSplitWithChange,
    handleAddExpense,
    getFilteredExpenses,
    handleRemoveExpense,
  } = useAppState();

  // Use our custom theme hook for consistent theming
  const { isDarkMode, colors } = useTheme();

  const styles = StyleSheet.create({
    tabContent: { padding: 16, flex: 1 },
    filterContainer: { marginBottom: 16, backgroundColor: isDarkMode ? colors.surface : colors.background, padding: 12, borderRadius: 8 },
    filterTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
    label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 },
    selectItem: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: colors.buttonSecondary, minWidth: 80, alignItems: 'center', margin: 4 },
    selectedItem: { backgroundColor: colors.primary, borderColor: colors.primary },
    selectItemText: { color: colors.textSecondary },
    selectedItemText: { color: '#FFFFFF', fontWeight: '500' },
    dateRangeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    dateButton: { flex: 1, padding: 10, backgroundColor: colors.buttonSecondary, borderRadius: 6, margin: 2, alignItems: 'center' },
    dateButtonText: { color: colors.text },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: isDarkMode ? colors.buttonSecondary : colors.surface, color: colors.text },
    addButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    addButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
    selectContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
    categoryPickerContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, justifyContent: 'space-between' },
    categoryPickerItem: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: colors.buttonSecondary, margin: 4, width: '48%', alignItems: 'center', marginBottom: 8 },
    selectedCategoryItem: { backgroundColor: colors.primary, borderColor: colors.primary },
    expenseItem: { borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingVertical: 12, marginBottom: 8 },
    expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    expenseDescription: { fontSize: 16, fontWeight: '500', color: colors.text, flex: 1, marginRight: 8 },
    expenseAmount: { fontSize: 16, fontWeight: '600', color: colors.success },
    expenseDetails: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
    expenseDate: { fontSize: 12, color: colors.textPlaceholder, marginBottom: 8, fontStyle: 'italic' },
    deleteButton: { alignSelf: 'flex-start', padding: 6, marginTop: 8 },
    deleteButtonText: { color: colors.error, fontSize: 14, fontWeight: '500' },
    emptyMessage: { textAlign: 'center', padding: 16, color: colors.textSecondary },
  });

  if (isLoading) {
    return (
      <View style={[styles.tabContent, { flex: 1, justifyContent: 'center', alignItems: 'center' }] }>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: colors.text, marginTop: 16 }}>
          Loading your data...
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.tabContent}
      data={getFilteredExpenses()}
      keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
      ListHeaderComponent={
        <>
          {/* Filter Section */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterTitle}>Filter Expenses</Text>
            {/* Category Filter */}
            <Text style={styles.label}>Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[
                    styles.selectItem,
                    categoryFilter === 'All' && styles.selectedItem,
                  ]}
                  onPress={() => setCategoryFilter('All')}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      categoryFilter === 'All' && styles.selectedItemText,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.selectItem,
                      categoryFilter === category && styles.selectedItem,
                    ]}
                    onPress={() => setCategoryFilter(category)}
                  >
                    <Text
                      style={[
                        styles.selectItemText,
                        categoryFilter === category && styles.selectedItemText,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {/* Date Range Filter */}
            <Text style={[styles.label, { marginTop: 12 }]}>Date Range:</Text>
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openDatePicker('start')}
              >
                <Text style={styles.dateButtonText}>{dateRange.start}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openDatePicker('end')}
              >
                <Text style={styles.dateButtonText}>{dateRange.end}</Text>
              </TouchableOpacity>
            </View>
            {/* Quick date range buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[styles.selectItem, { marginRight: 8 }]}
                  onPress={() => {
                    // Get today at midnight for consistent date handling
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Calculate 7 days ago
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    
                    // Format dates as YYYY-MM-DD
                    const todayStr = today.toISOString().split('T')[0];
                    const weekAgoStr = weekAgo.toISOString().split('T')[0];
                    
                    setDateRange({ start: weekAgoStr, end: todayStr });
                  }}
                >
                  <Text style={styles.selectItemText}>Last 7 days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectItem, { marginRight: 8 }]}
                  onPress={() => {
                    // Get today at midnight for consistent date handling
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Calculate 30 days ago
                    const monthAgo = new Date(today);
                    monthAgo.setDate(today.getDate() - 30);
                    
                    // Format dates as YYYY-MM-DD
                    const todayStr = today.toISOString().split('T')[0];
                    const monthAgoStr = monthAgo.toISOString().split('T')[0];
                    
                    setDateRange({ start: monthAgoStr, end: todayStr });
                  }}
                >
                  <Text style={styles.selectItemText}>Last 30 days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectItem, { marginRight: 8 }]}
                  onPress={() => {
                    // Get today at midnight for consistent date handling
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Calculate 1 year ago
                    const yearAgo = new Date(today);
                    yearAgo.setFullYear(today.getFullYear() - 1);
                    
                    // Format dates as YYYY-MM-DD
                    const todayStr = today.toISOString().split('T')[0];
                    const yearAgoStr = yearAgo.toISOString().split('T')[0];
                    
                    setDateRange({ start: yearAgoStr, end: todayStr });
                  }}
                >
                  <Text style={styles.selectItemText}>Last Year</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectItem, { marginRight: 8 }]}
                  onPress={() => {
                    // Get oldest possible date (for "All Time")
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayStr = today.toISOString().split('T')[0];
                    
                    // Use a very old date for "All Time"
                    const oldDate = "2000-01-01";
                    
                    setDateRange({ start: oldDate, end: todayStr });
                  }}
                >
                  <Text style={styles.selectItemText}>All Time</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          {/* Add Expense Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add New Expense</Text>
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={colors.textPlaceholder}
              value={newExpense.description}
              onChangeText={(text) => setNewExpense({ ...newExpense, description: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numeric"
              value={newExpense.amount.toString()}
              onChangeText={(text) => setNewExpense({ ...newExpense, amount: Number(text) })}
            />
            <Text style={styles.label}>Paid By:</Text>
            <View style={styles.selectContainer}>
              {roommates.map((mate) => (
                <TouchableOpacity
                  key={mate}
                  style={[
                    styles.selectItem,
                    newExpense.paidBy === mate && styles.selectedItem,
                  ]}
                  onPress={() => setNewExpense({ ...newExpense, paidBy: mate })}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      newExpense.paidBy === mate && styles.selectedItemText,
                    ]}
                  >
                    {mate}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Split With:</Text>
            <View style={styles.selectContainer}>
              {roommates.map((mate) => (
                <TouchableOpacity
                  key={mate}
                  style={[
                    styles.selectItem,
                    newExpense.splitWith.includes(mate) && styles.selectedItem,
                  ]}
                  onPress={() => handleSplitWithChange(mate)}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      newExpense.splitWith.includes(mate) && styles.selectedItemText,
                    ]}
                  >
                    {mate}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Category:</Text>
            <View style={styles.categoryPickerContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryPickerItem,
                    newExpense.category === category && styles.selectedCategoryItem,
                  ]}
                  onPress={() => setNewExpense({ ...newExpense, category })}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      newExpense.category === category && styles.selectedItemText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
              <Text style={styles.addButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.expenseItem}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseDescription}>{item.description}</Text>
            <Text style={styles.expenseAmount}>₹{item.amount.toFixed(2)}</Text>
          </View>
          <Text style={styles.expenseDetails}>Paid by: {item.paidBy}</Text>
          <Text style={styles.expenseDetails}>Split with: {item.splitWith.join(', ')}</Text>
          <Text style={styles.expenseDate}>{item.date} {item.time}</Text>
          <Text style={styles.expenseDetails}>Category: {item.category}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => item.id && handleRemoveExpense(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyMessage}>No expenses to show</Text>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={true}
    />
  );
};

export default ExpensesTab;