
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
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
  useWindowDimensions,
} from 'react-native';
// import LinearGradient from 'react-native-linear-gradient'; // Will add this dependency later
import { AppStateProvider, useAppState } from './AppStateProvider';
import { AuthProvider, useAuth } from './AuthProvider';
import { useTheme } from './useTheme';
import { ModernButton, ModernCard, ModernHeader, ModernTab, Icons } from './ModernUI';
import Svg, { Path } from 'react-native-svg';
import mobileAds, { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ANDROID_BANNER_AD_UNIT_ID } from './adConfig';
import ExpensesTab from './ExpensesTab';
import RoommatesTab from './RoommatesTab';
import SummaryTab from './SummaryTab';
import FinancialInsightsTab from './FinancialInsightsTab';
import SettingsTab from './SettingsTab';
import { AuthContainer } from './AuthScreens';
import UserProfile from './UserProfile';
import { shouldRequestStoragePermission, requestStoragePermissionInApp } from './pdfExport_clean';
import notifee, { EventType } from '@notifee/react-native';
import Share from 'react-native-share';
// Custom Logout SVG icon using provided path data
const LogoutSvg: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12.9999 2C10.2385 2 7.99991 4.23858 7.99991 7C7.99991 7.55228 8.44762 8 8.99991 8C9.55219 8 9.99991 7.55228 9.99991 7C9.99991 5.34315 11.3431 4 12.9999 4H16.9999C18.6568 4 19.9999 5.34315 19.9999 7V17C19.9999 18.6569 18.6568 20 16.9999 20H12.9999C11.3431 20 9.99991 18.6569 9.99991 17C9.99991 16.4477 9.55219 16 8.99991 16C8.44762 16 7.99991 16.4477 7.99991 17C7.99991 19.7614 10.2385 22 12.9999 22H16.9999C19.7613 22 21.9999 19.7614 21.9999 17V7C21.9999 4.23858 19.7613 2 16.9999 2H12.9999Z" fill={color} />
    <Path d="M13.9999 11C14.5522 11 14.9999 11.4477 14.9999 12C14.9999 12.5523 14.5522 13 13.9999 13V11Z" fill={color} />
    <Path d="M5.71783 11C5.80685 10.8902 5.89214 10.7837 5.97282 10.682C6.21831 10.3723 6.42615 10.1004 6.57291 9.90549C6.64636 9.80795 6.70468 9.72946 6.74495 9.67492L6.79152 9.61162L6.804 9.59454L6.80842 9.58848C6.80846 9.58842 6.80892 9.58778 5.99991 9L6.80842 9.58848C7.13304 9.14167 7.0345 8.51561 6.58769 8.19098C6.14091 7.86637 5.51558 7.9654 5.19094 8.41215L5.18812 8.41602L5.17788 8.43002L5.13612 8.48679C5.09918 8.53682 5.04456 8.61033 4.97516 8.7025C4.83623 8.88702 4.63874 9.14542 4.40567 9.43937C3.93443 10.0337 3.33759 10.7481 2.7928 11.2929L2.08569 12L2.7928 12.7071C3.33759 13.2519 3.93443 13.9663 4.40567 14.5606C4.63874 14.8546 4.83623 15.113 4.97516 15.2975C5.04456 15.3897 5.09918 15.4632 5.13612 15.5132L5.17788 15.57L5.18812 15.584L5.19045 15.5872C5.51509 16.0339 6.14091 16.1336 6.58769 15.809C7.0345 15.4844 7.13355 14.859 6.80892 14.4122L5.99991 15C6.80892 14.4122 6.80897 14.4123 6.80892 14.4122L6.804 14.4055L6.79152 14.3884L6.74495 14.3251C6.70468 14.2705 6.64636 14.1921 6.57291 14.0945C6.42615 13.8996 6.21831 13.6277 5.97282 13.318C5.89214 13.2163 5.80685 13.1098 5.71783 13H13.9999V11H5.71783Z" fill={color} />
  </Svg>
);

const BANNER_AD_UNIT_ID = ANDROID_BANNER_AD_UNIT_ID;

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
      marginTop: 16,
      fontSize: 16,
      fontWeight: '500'
    }
  });
  
  if (authLoading) {
    return (
      <View style={[authStyles.container, { backgroundColor: colors.primary }]}>
        <ActivityIndicator size="large" color={colors.textOnPrimary} />
        <Text style={[authStyles.loadingText, { color: colors.textOnPrimary }]}>Loading...</Text>
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
    openDatePicker, updateDateRange, confirmAddCategory, generateExpenseStats,
    tabsScrollEnabled
  } = useAppState();

  // Local state for date input
  const [tempDateInput, setTempDateInput] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const scrollRef = useRef<GHScrollView>(null);
  const deviceWidth = Dimensions.get('window').width;
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const tabOrder: Array<'expenses' | 'roommates' | 'summary' | 'financialInsights'> = ['expenses','roommates','summary','financialInsights'];

  useEffect(() => {
    const index = tabOrder.indexOf(activeTab as any);
    if (index >= 0) {
      scrollRef.current?.scrollTo({ x: index * deviceWidth, animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Open exported PDF when user taps the notification (foreground and cold start)
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        if (type === EventType.PRESS && detail.pressAction?.id === 'open-pdf') {
          const fp = (detail.notification?.data as any)?.filePath as string | undefined;
          if (fp) {
            try { await Share.open({ url: `file://${fp}` , type: 'application/pdf', showAppsToView: true }); } catch {}
          }
        }
      } catch {}
    });

    (async () => {
      try {
        const initial = await notifee.getInitialNotification();
        if (initial?.pressAction?.id === 'open-pdf') {
          const fp = (initial.notification?.data as any)?.filePath as string | undefined;
          if (fp) {
            try { await Share.open({ url: `file://${fp}`, type: 'application/pdf', showAppsToView: true }); } catch {}
          }
        }
      } catch {}
    })();

    return () => { try { unsubscribe(); } catch {} };
  }, []);

  // Initialize AdMob once
  useEffect(() => {
    mobileAds().initialize().catch(() => {});
  }, []);

  // Check for storage permissions on app launch (like WhatsApp does)
  useEffect(() => {
    const checkStoragePermissionsOnLaunch = async () => {
      try {
        const needsPermission = await shouldRequestStoragePermission();
        if (needsPermission) {
          // Wait a bit for the app to fully load, then show permission request
          setTimeout(async () => {
            const granted = await requestStoragePermissionInApp();
            console.log('Storage permission granted on launch:', granted);
          }, 2000); // 2 second delay like WhatsApp
        }
      } catch (error) {
        console.log('Error checking permissions on launch:', error);
      }
    };

    checkStoragePermissionsOnLaunch();
  }, []);

  // Base background style
  const backgroundStyle = {
    backgroundColor: colors.background,
    flex: 1,
  };

  // Create the modern styles inside the component
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingVertical: 20,
      paddingHorizontal: 20,
      backgroundColor: 'transparent',
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'nowrap',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.9,
      flexShrink: 1,
      flexWrap: 'wrap',
      maxWidth: '80%',
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    welcomeText: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 8,
      fontWeight: '600',
    },
    logoutButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.buttonSecondary,
      borderRadius: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
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
      minWidth: 72,
      justifyContent: 'flex-end',
      flexShrink: 0,
    },
    profileButton: {
      padding: 10,
      backgroundColor: colors.primary,
      borderRadius: 20,
      marginRight: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    profileEmoji: {
      fontSize: 16,
      color: colors.textOnPrimary,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingHorizontal: isTablet ? 24 : 16,
      paddingVertical: 8,
      marginHorizontal: isTablet ? 0 : 16,
      marginBottom: 16,
      borderRadius: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    tabScrollContent: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 4,
      paddingRight: 4,
      justifyContent: 'space-between',
    },
    tabRow: {
      flexDirection: 'row',
      width: '100%',
      alignItems: 'stretch',
      justifyContent: 'space-evenly',
      gap: 4,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      marginHorizontal: 2,
    },
    activeTab: {
      backgroundColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    tabText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '500',
    },
    activeTabText: {
      color: colors.textOnPrimary,
      fontWeight: '600',
    },
    tabContent: {
      padding: 16,
      flex: 1,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
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
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 16,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
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
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    addButtonText: {
      color: colors.textOnPrimary,
      fontWeight: '600',
      fontSize: 16,
      letterSpacing: 0.5,
    },
    emptyMessage: {
      textAlign: 'center',
      padding: 16,
      color: colors.textSecondary,
    },
    expenseItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.borderLight,
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
      width: '85%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 20,
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.3,
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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              ellipsizeMode="tail"
            >
              ₹ Bill Buddy
            </Text>
            <Text style={styles.headerSubtitle}>Split bills. Stay buddies.</Text>
            {user && (
              <Text style={styles.welcomeText}>Welcome back, {user.displayName?.split(' ')[0] || 'Friend'}! 👋</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleLogout} style={[styles.profileButton, { marginRight: 8 }]}> 
              <LogoutSvg size={18} color={colors.textOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.profileButton}>
              <Icons.User />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.tabBar}>
        {isTablet ? (
          <View style={styles.tabRow}>
            <ModernTab
              title="Expenses"
              isActive={activeTab === 'expenses'}
              onPress={() => handleTabChange('expenses')}
            />
            <ModernTab
              title="Friends"
              isActive={activeTab === 'roommates'}
              onPress={() => handleTabChange('roommates')}
            />
            <ModernTab
              title="Summary"
              isActive={activeTab === 'summary'}
              onPress={() => handleTabChange('summary')}
            />
            <ModernTab
              title="Insights"
              isActive={activeTab === 'financialInsights'}
              onPress={() => handleTabChange('financialInsights')}
            />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            <ModernTab
              title="Expenses"
              isActive={activeTab === 'expenses'}
              onPress={() => handleTabChange('expenses')}
            />
            <ModernTab
              title="Friends"
              isActive={activeTab === 'roommates'}
              onPress={() => handleTabChange('roommates')}
            />
            <ModernTab
              title="Summary"
              isActive={activeTab === 'summary'}
              onPress={() => handleTabChange('summary')}
            />
            <ModernTab
              title="Insights"
              isActive={activeTab === 'financialInsights'}
              onPress={() => handleTabChange('financialInsights')}
            />
          </ScrollView>
        )}
      </View>
      <GHScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={tabsScrollEnabled}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e: any) => {
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
          <ExpensesTab tabScrollSimultaneousRef={scrollRef} />
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
      </GHScrollView>
      {/* AdMob banner below tabs */}
      <View style={{ alignItems: 'center', backgroundColor: colors.surface, paddingVertical: 4 }}>
        <BannerAd unitId={BANNER_AD_UNIT_ID} size={BannerAdSize.BANNER} />
      </View>
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
    </GestureHandlerRootView>
  );
}