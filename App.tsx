
import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateProvider, useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';
import ExpensesTab from './ExpensesTab';
import RoommatesTab from './RoommatesTab';
import SummaryTab from './SummaryTab';
import SettlementsTab from './SettlementsTab';
import StatisticsTab from './StatisticsTab';

// Define our interfaces
interface Expense {
  id?: number;
  description: string;
  amount: number;
  paidBy: string;
  splitWith: string[];
  date: string;
  time: string;
  category: string; // Added category field
}

interface Balance {
  paid: number;
  owes: number;
  balance: number;
}

interface SummaryData {
  [roommate: string]: {
    paid: number;
    owes: number;
    balance: number;
  };
}

type StoredData = {
  expenses: Expense[];
  roommates: string[];
  categories: string[]; // Added categories
};

type SettlementItem = { text: string; key: string } | { key: string; from: string; to: string; amount: number };

// Predefined expense categories
const DEFAULT_CATEGORIES = [
  'Groceries',
  'Utilities',
  'Rent',
  'Internet',
  'Household Items',
  'Entertainment',
  'Other'
];

// Main App component
export default function App() {
  return (
    <AppStateProvider>
      <MainAppContent />
    </AppStateProvider>
  );
}

// Move the rest of your app logic into MainAppContent
function MainAppContent() {
  // Use our centralized theme hook
  const { isDarkMode, colors } = useTheme();
  // State variables (from context)
  const {
    activeTab, setActiveTab, showDatePicker, setShowDatePicker, expenses, setExpenses, newExpense, setNewExpense,
    roommates, setRoommates, newRoommate, setNewRoommate, summaryData, settlements, categories, setCategories,
    isLoading, categoryFilter, setCategoryFilter, dateRange, setDateRange, datePickerType, setDatePickerType,
    showCategoryModal, setShowCategoryModal, newCategoryName, setNewCategoryName, getFilteredExpenses,
    handleAddExpense, handleAddRoommate, handleRemoveExpense, handleRemoveRoommate, handleSplitWithChange,
    openDatePicker, updateDateRange, confirmAddCategory, generateExpenseStats
  } = useAppState();

  // Local state for date input
  const [tempDateInput, setTempDateInput] = useState('');

  // Base background style
  const backgroundStyle = {
    backgroundColor: colors.background,
    flex: 1,
  };

  // Create the styles inside the component
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      padding: 16,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.primary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabButton: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 3,
      borderBottomColor: colors.primary,
      backgroundColor: colors.buttonSecondary,
    },
    tabText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: '600',
    },
    tabContent: {
      padding: 16,
      flex: 1,
    },
    card: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#ccc',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#ffffff',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: isDarkMode ? '#DDDDDD' : '#333333',
      marginBottom: 8,
    },
    selectContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
    },
    selectItem: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#ddd',
      borderRadius: 8,
      padding: 8,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#f0f0f0',
      minWidth: 80,
      alignItems: 'center',
      margin: 4,
    },
    selectedItem: {
      backgroundColor: '#4F46E5',
      borderColor: '#4F46E5',
    },
    selectItemText: {
      color: isDarkMode ? '#A1A1A1' : '#666666',
    },
    selectedItemText: {
      color: '#FFFFFF',
      fontWeight: '500',
    },
    addButton: {
      backgroundColor: '#4F46E5',
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    addButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },
    emptyMessage: {
      textAlign: 'center',
      padding: 16,
      color: isDarkMode ? '#A1A1A1' : '#6B7280',
    },
    expenseItem: {
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#eee',
      paddingVertical: 12,
      marginBottom: 8,
    },
    expenseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    expenseDescription: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      flex: 1,
      marginRight: 8,
    },
    expenseAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: '#10B981',
    },
    expenseDetails: {
      fontSize: 14,
      color: isDarkMode ? '#A1A1A1' : '#6B7280',
      marginBottom: 2,
    },
    expenseDate: {
      fontSize: 12,
      color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
      marginBottom: 8,
      fontStyle: 'italic',
    },
    expenseSplitWith: {
      fontSize: 14,
      color: isDarkMode ? '#A1A1A1' : '#6B7280',
      marginTop: 4,
    },
    deleteButton: {
      alignSelf: 'flex-start',
      padding: 6,
      marginTop: 8,
    },
    deleteButtonText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '500',
    },
    roommateItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#eee',
    },
    roommateName: {
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    roommateInputContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    roommateInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#ccc',
      borderRadius: 8,
      padding: 12,
      marginRight: 8,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#ffffff',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    summaryItem: {
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#eee',
      paddingVertical: 12,
    },
    summaryName: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    summaryDetails: {
      marginLeft: 8,
      marginTop: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    summaryLabel: {
      width: 60,
      color: isDarkMode ? '#A1A1A1' : '#6B7280',
    },
    summaryValue: {
      color: isDarkMode ? '#DDDDDD' : '#333333',
    },
    summaryBalance: {
      fontWeight: '600',
    },
    positiveBalance: {
      color: '#10B981',
    },
    negativeBalance: {
      color: '#EF4444',
    },
    settlementItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#eee',
    },
    settlementText: {
      fontSize: 14,
      color: isDarkMode ? '#E5E7EB' : '#333333',
    },
    debtorName: {
      color: '#EF4444',
      fontWeight: '600',
    },
    creditorName: {
      color: '#10B981',
      fontWeight: '600',
    },
    settlementAmount: {
      color: '#4F46E5',
      fontWeight: '600',
    },
    filterContainer: {
      marginBottom: 16,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#f5f5f5',
      padding: 12,
      borderRadius: 8,
    },
    filterTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#DDDDDD' : '#333333',
      marginBottom: 8,
    },
    picker: {
      height: 50,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    dateRangeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    dateButton: {
      flex: 1,
      padding: 10,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#E5E7EB',
      borderRadius: 6,
      margin: 2,
      alignItems: 'center',
    },
    dateButtonText: {
      color: isDarkMode ? '#DDDDDD' : '#333333',
    },
    modalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '80%',
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 15,
      color: colors.text,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    modalButton: {
      padding: 10,
      borderRadius: 6,
      minWidth: 80,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.buttonSecondary,
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontWeight: '500',
    },
    cancelButtonText: {
      color: colors.text,
    },
    confirmButtonText: {
      color: '#FFFFFF',
    },
    categoryTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginRight: 4,
      backgroundColor: '#4F46E5',
    },
    categoryTagText: {
      color: '#FFFFFF',
      fontSize: 12,
    },
    statisticsCard: {
      marginTop: 8,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#eee',
    },
    statLabel: {
      fontSize: 14,
      color: isDarkMode ? '#A1A1A1' : '#6B7280',
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#eee',
    },
    pickerItemText: {
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      textAlign: 'center',
    },
    categoryPickerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
      justifyContent: 'space-between',
    },
    categoryPickerItem: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#ddd',
      borderRadius: 8,
      padding: 8,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#f0f0f0',
      margin: 4,
      width: '48%',
      alignItems: 'center',
      marginBottom: 8,
    },
    selectedCategoryItem: {
      backgroundColor: '#4F46E5',
      borderColor: '#4F46E5',
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{color: colors.text, marginTop: 16}}>
          Loading your data...
        </Text>
      </View>
    );
  }

  // Removed unused render functions since we now use separate tab components

  // Render the main app content
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Roommate Expense Tracker</Text>
        <Text style={styles.headerSubtitle}>Track and manage shared expenses</Text>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expenses' && styles.activeTab]}
          onPress={() => setActiveTab('expenses')}>
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'roommates' && styles.activeTab]}
          onPress={() => setActiveTab('roommates')}>
          <Text style={[styles.tabText, activeTab === 'roommates' && styles.activeTabText]}>
            Roommates
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'summary' && styles.activeTab]}
          onPress={() => setActiveTab('summary')}>
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settlements' && styles.activeTab]}
          onPress={() => setActiveTab('settlements')}>
          <Text style={[styles.tabText, activeTab === 'settlements' && styles.activeTabText]}>
            Settlements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'statistics' && styles.activeTab]}
          onPress={() => setActiveTab('statistics')}>
          <Text style={[styles.tabText, activeTab === 'statistics' && styles.activeTabText]}>
            Statistics
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'roommates' && <RoommatesTab />}
      {activeTab === 'summary' && <SummaryTab />}
      {activeTab === 'settlements' && <SettlementsTab />}
      {activeTab === 'statistics' && <StatisticsTab />}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={() => {
          setShowDatePicker(false);
          setTempDateInput('');
        }}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select {datePickerType === 'start' ? 'Start' : 'End'} Date
            </Text>
            <Text style={styles.label}>Enter date (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.input}
              placeholder="2024-01-01"
              placeholderTextColor={colors.textPlaceholder}
              value={tempDateInput}
              onChangeText={setTempDateInput}
              onFocus={() => {
                const currentValue = datePickerType === 'start' ? dateRange.start : dateRange.end;
                setTempDateInput(currentValue);
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDatePicker(false);
                  setTempDateInput('');
                }}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  if (tempDateInput && tempDateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    updateDateRange(tempDateInput);
                    setShowDatePicker(false);
                    setTempDateInput('');
                  } else {
                    Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
                  }
                }}>
                <Text style={[styles.buttonText, styles.confirmButtonText]}>
                  Set Date
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCategoryModal}
        onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Category Name"
              placeholderTextColor={colors.textPlaceholder}
              value={newCategoryName}
              onChangeText={(text: string) => setNewCategoryName(text)}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCategoryModal(false)}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmAddCategory}>
                <Text style={[styles.buttonText, styles.confirmButtonText]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
