
import { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import {
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { AppStateProvider, useAppState } from './AppStateProvider';
import { AuthProvider, useAuth } from './AuthProvider';
import { useTheme } from './useTheme';
import ExpensesTab from './ExpensesTab';
import RoommatesTab from './RoommatesTab';
import SummaryTab from './SummaryTab';
import FinancialInsightsTab from './FinancialInsightsTab';
import SettingsTab from './SettingsTab';
import { AuthContainer } from './AuthScreens';
import UserProfile from './UserProfile';

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
    <AuthProvider>
      <AppStateProvider>
        <AppWithAuth />
      </AppStateProvider>
    </AuthProvider>
  );
}

// Wrapper component that handles auth state
function AppWithAuth() {
  const { user, isLoading: authLoading } = useAuth();
  const { colors } = useTheme();
  
  // Create styles for this component
  const authStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center'
    },
    loadingText: {
      color: colors.text,
      marginTop: 16
    }
  });
  
  if (authLoading) {
    return (
      <View style={authStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={authStyles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // If no user is logged in, show auth screens
  if (!user) {
    return <AuthContainer />;
  }
  
  // If user is logged in, show main app content
  return <MainAppContent />;
}

// Move the rest of your app logic into MainAppContent
function MainAppContent() {
  // Use our centralized theme hook
  const { isDarkMode, colors } = useTheme();
  const { user, logout } = useAuth();
  // State variables (from context)
  const {
    activeTab, setActiveTab, handleTabChange, showDatePicker, setShowDatePicker, expenses, setExpenses, newExpense, setNewExpense,
    roommates, setRoommates, newRoommate, setNewRoommate, summaryData, settlements, categories, setCategories,
    isLoading, categoryFilter, setCategoryFilter, dateRange, setDateRange, datePickerType, setDatePickerType,
    showCategoryModal, setShowCategoryModal, newCategoryName, setNewCategoryName, getFilteredExpenses,
    handleAddExpense, handleAddRoommate, handleRemoveExpense, handleRemoveRoommate, handleSplitWithChange,
    openDatePicker, updateDateRange, confirmAddCategory, generateExpenseStats
  } = useAppState();

  // Local state for date input
  const [tempDateInput, setTempDateInput] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const deviceWidth = Dimensions.get('window').width;
  const tabOrder: Array<'expenses' | 'roommates' | 'summary' | 'financialInsights'> = ['expenses','roommates','summary','financialInsights'];

  useEffect(() => {
    const index = tabOrder.indexOf(activeTab as any);
    if (index >= 0) {
      scrollRef.current?.scrollTo({ x: index * deviceWidth, animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'nowrap',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.primary,
      flexShrink: 1,
      flexWrap: 'wrap',
      maxWidth: '60%',
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    welcomeText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    logoutButton: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: colors.buttonSecondary,
      borderRadius: 6,
    },
    logoutText: {
      color: colors.text,
      fontWeight: '500',
      fontSize: 12,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 130,
      justifyContent: 'flex-end',
      flexShrink: 0,
    },
    profileButton: {
      padding: 6,
      backgroundColor: colors.buttonSecondary,
      borderRadius: 16,
      marginRight: 6,
    },
    profileEmoji: {
      fontSize: 16,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      flexWrap: 'wrap',
      justifyContent: 'space-around',
    },
    tabButton: {
      minWidth: 80,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      flexShrink: 1,
    },
    activeTab: {
      borderBottomWidth: 3,
      borderBottomColor: colors.primary,
      backgroundColor: colors.buttonSecondary,
    },
    tabText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      flexWrap: 'wrap',
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
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    selectContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
    },
    selectItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 8,
      backgroundColor: colors.buttonSecondary,
      minWidth: 80,
      alignItems: 'center',
      margin: 4,
    },
    selectedItem: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    selectItemText: {
      color: colors.textSecondary,
    },
    selectedItemText: {
      color: '#FFFFFF',
      fontWeight: '500',
    },
    addButton: {
      backgroundColor: colors.buttonPrimary,
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
      color: colors.textSecondary,
    },
    expenseItem: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
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
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    expenseAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.success,
    },
    expenseDetails: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    expenseDate: {
      fontSize: 12,
      color: colors.textPlaceholder,
      marginBottom: 8,
      fontStyle: 'italic',
    },
    expenseSplitWith: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    deleteButton: {
      alignSelf: 'flex-start',
      padding: 6,
      marginTop: 8,
    },
    deleteButtonText: {
      color: colors.error,
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
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginRight: 8,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    summaryItem: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      paddingVertical: 12,
    },
    summaryName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
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
      color: colors.textSecondary,
    },
    summaryValue: {
      color: colors.text,
    },
    summaryBalance: {
      fontWeight: '600',
    },
    positiveBalance: {
      color: colors.success,
    },
    negativeBalance: {
      color: colors.error,
    },
    settlementItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
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
    filterContainer: {
      marginBottom: 16,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
    },
    filterTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    picker: {
      height: 50,
      color: colors.text,
    },
    dateRangeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    dateButton: {
      flex: 1,
      padding: 10,
      backgroundColor: colors.buttonSecondary,
      borderRadius: 6,
      margin: 2,
      alignItems: 'center',
    },
    dateButtonText: {
      color: colors.text,
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
      color: isDarkMode ? colors.text : '#FFFFFF',
    },
    categoryTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginRight: 4,
      backgroundColor: colors.primary,
    },
    categoryTagText: {
      color: isDarkMode ? colors.text : '#FFFFFF',
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    pickerItemText: {
      fontSize: 16,
      color: colors.text,
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
      borderColor: colors.border,
      borderRadius: 8,
      padding: 8,
      backgroundColor: isDarkMode ? colors.surface : colors.buttonSecondary,
      margin: 4,
      width: '48%',
      alignItems: 'center',
      marginBottom: 8,
    },
    selectedCategoryItem: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{color: colors.text, marginTop: 16}}>
          Loading your data...
        </Text>
      </View>
    );
  }

  // Removed unused render functions since we now use separate tab components

  // Render the main app content
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: async () => await logout(), style: 'destructive' }
      ]
    );
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit>Roommate Expense Tracker</Text>
            <Text style={styles.headerSubtitle}>Track and manage shared expenses</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.profileButton}>
              <Text style={styles.profileEmoji}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
        {user && (
          <Text style={styles.welcomeText}>Welcome, {user.displayName || user.email}</Text>
        )}
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expenses' && styles.activeTab]}
          onPress={() => handleTabChange('expenses')}>
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'roommates' && styles.activeTab]}
          onPress={() => handleTabChange('roommates')}>
          <Text style={[styles.tabText, activeTab === 'roommates' && styles.activeTabText]}>
            Roommates
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'summary' && styles.activeTab]}
          onPress={() => handleTabChange('summary')}>
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'financialInsights' && styles.activeTab]}
          onPress={() => handleTabChange('financialInsights')}>
          <Text style={[styles.tabText, activeTab === 'financialInsights' && styles.activeTabText]}>
            Insights
          </Text>
        </TouchableOpacity>
        {null}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const index = Math.round(x / deviceWidth);
          const nextTab = tabOrder[index];
          if (nextTab && nextTab !== activeTab) {
            handleTabChange(nextTab);
          }
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
     >
        <View style={{ width: deviceWidth, flex: 1 }}>
          <ExpensesTab />
        </View>
        <View style={{ width: deviceWidth, flex: 1 }}>
          <RoommatesTab />
        </View>
        <View style={{ width: deviceWidth, flex: 1 }}>
          <SummaryTab />
        </View>
        <View style={{ width: deviceWidth, flex: 1 }}>
          <FinancialInsightsTab />
        </View>
      </ScrollView>
      {null}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}>
        <SafeAreaView style={{flex:1, backgroundColor: colors.background}}>
          <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding: 16, borderBottomWidth:1, borderBottomColor: colors.border, backgroundColor: colors.surface}}>
            <Text style={{fontSize:18, fontWeight:'600', color: colors.text}}>Your Profile</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)} style={[styles.logoutButton, {paddingHorizontal:12}]}> 
              <Text style={styles.logoutText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={{flex:1}}>
            <UserProfile />
          </View>
        </SafeAreaView>
      </Modal>
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
                    // Validate that the date is a valid date (not just matching the pattern)
                    const dateObj = new Date(tempDateInput);
                    if (isNaN(dateObj.getTime())) {
                      Alert.alert('Invalid Date', 'Please enter a valid date');
                      return;
                    }
                    
                    // Validate date range (start date should be before or equal to end date)
                    if (datePickerType === 'start' && new Date(tempDateInput) > new Date(dateRange.end)) {
                      Alert.alert('Invalid Date Range', 'Start date cannot be after end date');
                      return;
                    } else if (datePickerType === 'end' && new Date(tempDateInput) < new Date(dateRange.start)) {
                      Alert.alert('Invalid Date Range', 'End date cannot be before start date');
                      return;
                    }
                    
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
