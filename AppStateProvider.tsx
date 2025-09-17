import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthProvider';
import { db } from './firebase';  // Import Firestore
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default categories if none are set
// Remove this declaration since DEFAULT_CATEGORIES is already declared below

// Define interfaces/types (copy from App.tsx as needed)
interface Expense {
  id?: number;
  description: string;
  amount: number;
  paidBy: string;
  splitWith: string[];
  date: string;
  time: string;
  category: string;
  userId?: string;
  firestoreId?: string;
  createdAt?: number;
}

interface Balance {
  paid: number;
  owes: number;
  balance: number;
}

interface SummaryData {
  [roommate: string]: Balance;
}

type StoredData = {
  expenses: Expense[];
  roommates: string[];
  categories: string[];
};

type SettlementItem = { text: string; key: string } | { key: string; from: string; to: string; amount: number };

const DEFAULT_CATEGORIES = [
  'Groceries',
  'Utilities',
  'Rent',
  'Internet',
  'Household Items',
  'Entertainment',
  'Other',
];

// Context value type
interface AppStateContextType {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  handleTabChange: (tab: string) => void;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  newExpense: Expense;
  setNewExpense: React.Dispatch<React.SetStateAction<Expense>>;
  roommates: string[];
  setRoommates: React.Dispatch<React.SetStateAction<string[]>>;
  newRoommate: string;
  setNewRoommate: React.Dispatch<React.SetStateAction<string>>;
  summaryData: SummaryData;
  settlements: SettlementItem[];
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  isLoading: boolean;
  categoryFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  showDatePicker: boolean;
  setShowDatePicker: React.Dispatch<React.SetStateAction<boolean>>;
  datePickerType: 'start' | 'end';
  setDatePickerType: React.Dispatch<React.SetStateAction<'start' | 'end'>>;
  showCategoryModal: boolean;
  setShowCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  newCategoryName: string;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
  getFilteredExpenses: () => Expense[];
  handleAddExpense: () => void;
  handleAddRoommate: () => void;
  handleRemoveExpense: (id?: number) => void;
  handleRemoveRoommate: (mate: string) => void;
  handleSplitWithChange: (mate: string) => void;
  openDatePicker: (type: 'start' | 'end') => void;
  updateDateRange: (date: string) => void;
  confirmAddCategory: () => void;
  generateExpenseStats: () => any;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get the current user from AuthProvider
  const { user } = useAuth();
  
  // All state and handlers from App.tsx go here
  const [activeTab, setActiveTab] = useState('expenses');
  
  // Handle tab selection to redirect settlements and statistics to financialInsights
  const handleTabChange = (tab: string) => {
    // If user tries to access the old tabs, redirect to the new combined tab
    if (tab === 'settlements' || tab === 'statistics') {
      setActiveTab('financialInsights');
    } else {
      setActiveTab(tab);
    }
  };
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState<Expense>({
    description: '',
    amount: 0,
    paidBy: '',
    splitWith: [],
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    category: 'Other',
  });
  const [roommates, setRoommates] = useState<string[]>([]);
  const [newRoommate, setNewRoommate] = useState<string>('');
  const [summaryData, setSummaryData] = useState<SummaryData>({});
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load data and subscribe to realtime expenses when user changes
  useEffect(() => {
    let unsubscribeExpenses: (() => void) | undefined;
    let unsubscribeUserDoc: (() => void) | undefined;
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Try local cache first for fast startup
        let cachedRoommates: string[] | undefined;
        let cachedCategories: string[] | undefined;
        try {
          const cacheKey = `mates:user:${user.uid}:profile`;
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.roommates)) {
              cachedRoommates = parsed.roommates;
              setRoommates(parsed.roommates);
            }
            if (Array.isArray(parsed.categories)) {
              cachedCategories = parsed.categories;
              setCategories(parsed.categories);
            }
            console.log('[Cache] Loaded roommates/categories from AsyncStorage');
          }
        } catch (e) {
          console.warn('[Cache] Failed to load from AsyncStorage', e);
        }

        // Get user document reference
        const userDocRef = doc(db!, 'users', user.uid);
        console.log('[Firestore] Fetching user document...');
        const userDoc = await getDoc(userDocRef);
        console.log('[Firestore] User document fetched:', userDoc.exists() ? 'exists' : 'not found');
        
        if (userDoc.exists()) {
          // User exists, load their data and subscribe for realtime updates
          const userData = userDoc.data();

          // Subscribe to user document for roommates/categories realtime updates
          const arraysEqual = (a?: any[], b?: any[]) => {
            if (!a && !b) return true;
            if (!a || !b) return false;
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
              if (a[i] !== b[i]) return false;
            }
            return true;
          };

          unsubscribeUserDoc = onSnapshot(userDocRef, (docSnapshot) => {
            const data = docSnapshot.data();
            if (data) {
              const nextRoommates = Array.isArray(data.roommates) ? data.roommates : undefined;
              const nextCategories = Array.isArray(data.categories) ? data.categories : undefined;
              if (nextRoommates && !arraysEqual(nextRoommates, roommates)) setRoommates(nextRoommates); 
              if (nextCategories && !arraysEqual(nextCategories, categories)) setCategories(nextCategories);
              // Cache locally
              AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({
                roommates: nextRoommates ?? [],
                categories: nextCategories ?? DEFAULT_CATEGORIES,
              })).catch(() => {});
            }
          }, (err) => {
            console.warn('[Firestore] User doc listener error:', err);
          });

          // Realtime expenses subscription
          const expensesQuery = query(collection(db!, 'expenses'), where('userId', '==', user.uid));
          console.log('[Firestore] Subscribing to expenses...');
          unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
            const expensesData = snapshot.docs.map(docSnapshot => {
              const data = docSnapshot.data();
              return {
                ...data,
                firestoreId: docSnapshot.id,
                date: typeof data.date === 'object' && data.date?.toDate ? 
                  data.date.toDate().toISOString().split('T')[0] : 
                  data.date || new Date().toISOString().split('T')[0],
                time: data.time || new Date().toLocaleTimeString(),
                createdAt: typeof data.createdAt === 'number' 
                  ? data.createdAt 
                  : (data.date ? new Date(`${data.date}T00:00:00`).getTime() : Date.now())
              } as Expense;
            });
            console.log('[Firestore] Realtime expenses update. Count =', snapshot.size);
            setExpenses(expensesData);
          }, (err) => {
            console.warn('[Firestore] Expenses listener error:', err);
          });
          // Initialize local state immediately as well (before first snapshot)
          const initialRoommates = Array.isArray(userData.roommates) ? userData.roommates : [];
          const initialCategories = Array.isArray(userData.categories) ? userData.categories : DEFAULT_CATEGORIES;
          setRoommates(initialRoommates);
          setCategories(initialCategories);
          // Cache initial fetch
          AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({
            roommates: initialRoommates,
            categories: initialCategories,
          })).catch(() => {});

          // Reconcile: if Firestore has empty roommates but cache has data, push cache to Firestore
          if ((initialRoommates.length === 0) && cachedRoommates && cachedRoommates.length > 0) {
            try {
              console.log('[Sync] Firestore roommates empty; restoring from cache');
              await setDoc(userDocRef, { roommates: cachedRoommates, updatedAt: new Date() }, { merge: true });
              setRoommates(cachedRoommates);
              await AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({ roommates: cachedRoommates, categories: initialCategories.length ? initialCategories : (cachedCategories ?? DEFAULT_CATEGORIES) }));
            } catch (e) {
              console.warn('[Sync] Failed to restore roommates from cache', e);
            }
          }
        } else {
          // New user, create their document with default data
          await setDoc(userDocRef, {
            roommates: [],
            categories: DEFAULT_CATEGORIES,
            createdAt: new Date()
          });
          AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({ roommates: [], categories: DEFAULT_CATEGORIES })).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        Alert.alert('Error', 'Failed to load your data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    return () => {
      if (unsubscribeExpenses) {
        unsubscribeExpenses();
      }
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [user]);

  // Validate expense data when expenses change
  useEffect(() => {
    if (expenses.length > 0) {
      const needsValidation = expenses.some(expense => 
        typeof expense.amount !== 'number' || 
        !Array.isArray(expense.splitWith) || 
        !expense.category
      );
      
      if (needsValidation) {
        const validExpenses = expenses.map(expense => ({
          ...expense,
          amount: Number(expense.amount),
          splitWith: Array.isArray(expense.splitWith) ? expense.splitWith : [],
          category: expense.category || 'Other',
        }));
        setExpenses(validExpenses);
      }
    }
  }, [expenses]);

  // Removed auto-save effect to avoid feedback loops with onSnapshot updates.
  // Saving to Firestore is handled explicitly in action handlers (e.g., handleAddRoommate, confirmAddCategory).

  // Calculate balances whenever expenses or roommates change
  useEffect(() => {
    calculateBalances();
  }, [expenses, roommates]);

  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      // Check if category matches
      const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
      
      // Normalize dates for comparison by setting all to midnight
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      // Check if date is in range (inclusive of start and end dates)
      const isInDateRange = expenseDate >= startDate && expenseDate <= endDate;
      
      return matchesCategory && isInDateRange;
    });
  };

  const calculateBalances = () => {
    const balances: { [key: string]: Balance } = {};
    roommates.forEach((mate) => {
      balances[mate] = { paid: 0, owes: 0, balance: 0 };
    });
    expenses.forEach((expense) => {
      const payer = expense.paidBy;
      const amount = Number(expense.amount);
      const splitWith = expense.splitWith.length > 0 ? expense.splitWith : [...roommates];
      const splitAmount = amount / splitWith.length;
      if (balances[payer]) {
        balances[payer].paid += amount;
      }
      splitWith.forEach((mate) => {
        if (balances[mate]) {
          balances[mate].owes += splitAmount;
        }
      });
    });
    roommates.forEach((mate) => {
      if (balances[mate]) {
        balances[mate].balance = balances[mate].paid - balances[mate].owes;
      }
    });
    setSummaryData(balances);
    calculateSettlements(balances);
  };

  const calculateSettlements = (balances: { [key: string]: Balance }) => {
    const creditors: { name: string; amount: number }[] = [];
    const debtors: { name: string; amount: number }[] = [];
    roommates.forEach((mate) => {
      if (balances[mate]?.balance > 0) {
        creditors.push({ name: mate, amount: balances[mate].balance });
      } else if (balances[mate]?.balance < 0) {
        debtors.push({ name: mate, amount: -balances[mate].balance });
      }
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const settlementItems: SettlementItem[] = [];
    if (creditors.length > 0 && debtors.length > 0) {
      settlementItems.push({ text: 'Recommended Settlements', key: 'header' });
    } else {
      settlementItems.push({ text: 'No settlements needed at this time', key: 'no-settlements' });
    }
    let creditorIndex = 0;
    let debtorIndex = 0;
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];
      const amount = Math.min(creditor.amount, debtor.amount);
      const roundedAmount = Math.round(amount * 100) / 100;
      if (roundedAmount > 0) {
        settlementItems.push({ key: `payment-${debtorIndex}-${creditorIndex}`, from: debtor.name, to: creditor.name, amount: roundedAmount });
      }
      creditor.amount -= amount;
      debtor.amount -= amount;
      if (creditor.amount < 0.01) {
        creditorIndex++;
      }
      if (debtor.amount < 0.01) {
        debtorIndex++;
      }
    }
    setSettlements(settlementItems);
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0 || !newExpense.paidBy || !user) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }
    
    try {
      // Create a new expense document in Firestore
      const expensesCollectionRef = collection(db!, 'expenses');
      const newExpenseRef = doc(expensesCollectionRef);
      
      const expenseToAdd: Expense = {
        ...newExpense,
        id: Date.now(), // Keep numeric ID for local operations
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        firestoreId: newExpenseRef.id, // Store Firestore document ID
        createdAt: Date.now()
      };
      
      // Save to Firestore
      await setDoc(newExpenseRef, expenseToAdd);
      
      // Update local state
      setExpenses([...expenses, expenseToAdd]);
      setNewExpense({ description: '', amount: 0, paidBy: '', splitWith: [], date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString(), category: 'Other' });
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    }
  };

  const confirmAddCategory = () => {
    if (newCategoryName && newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
      setShowCategoryModal(false);
    } else if (categories.includes(newCategoryName.trim())) {
      Alert.alert('Duplicate Category', 'This category already exists');
    }
  };

  const handleAddRoommate = async () => {
    if (!newRoommate.trim()) {
      Alert.alert('Missing Information', 'Please enter a roommate name');
      return;
    }
    if (roommates.includes(newRoommate.trim())) {
      Alert.alert('Duplicate Roommate', 'This roommate already exists');
      return;
    }
    const updatedRoommates = [...roommates, newRoommate.trim()];
    setRoommates(updatedRoommates);
    setNewRoommate('');
    try {
      if (user) {
        const userDocRef = doc(db!, 'users', user.uid);
        await setDoc(userDocRef, { roommates: updatedRoommates, updatedAt: new Date() }, { merge: true });
        await AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({ roommates: updatedRoommates, categories }));
      }
    } catch (error) {
      console.warn('Failed to persist roommate add:', error);
    }
  };

  const handleRemoveExpense = (id?: number) => {
    if (!id || !user) return;
    
    // Find the expense in our local state first
    const expenseToDelete = expenses.find(expense => expense.id === id);
    if (!expenseToDelete) {
      Alert.alert('Error', 'Could not find the expense to delete.');
      return;
    }
    
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', onPress: async () => {
        try {
          if (expenseToDelete.firestoreId) {
            // If we have the Firestore ID, delete directly
            const expenseDocRef = doc(db!, 'expenses', expenseToDelete.firestoreId);
            await deleteDoc(expenseDocRef);
          } else {
            // Fallback to query if firestoreId is not available
            const expensesRef = collection(db!, 'expenses');
            const q = query(expensesRef, where('id', '==', id), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // Delete the found document
              const docToDelete = querySnapshot.docs[0];
              await deleteDoc(docToDelete.ref);
            } else {
              throw new Error('Expense document not found in Firestore');
            }
          }
          
          // Update local state
          const updatedExpenses = expenses.filter(expense => expense.id !== id);
          setExpenses(updatedExpenses);
        } catch (error) {
          console.error('Error removing expense:', error);
          Alert.alert('Error', 'Failed to remove expense. Please try again.');
        }
      }, style: 'destructive' },
    ]);
  };

  const handleRemoveRoommate = (mate: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this roommate? This will affect expense calculations.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => { const updatedRoommates = roommates.filter(roommate => roommate !== mate); setRoommates(updatedRoommates); try { if (user) { const userDocRef = doc(db!, 'users', user.uid); await setDoc(userDocRef, { roommates: updatedRoommates, updatedAt: new Date() }, { merge: true }); await AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({ roommates: updatedRoommates, categories })); } } catch (error) { console.warn('Failed to persist roommate removal:', error); } }, style: 'destructive' },
    ]);
  };

  const handleSplitWithChange = (mate: string) => {
    const updatedSplitWith = [...newExpense.splitWith];
    if (updatedSplitWith.includes(mate)) {
      const index = updatedSplitWith.indexOf(mate);
      updatedSplitWith.splice(index, 1);
    } else {
      updatedSplitWith.push(mate);
    }
    setNewExpense({ ...newExpense, splitWith: updatedSplitWith });
  };

  const openDatePicker = (type: 'start' | 'end') => {
    setDatePickerType(type);
    setShowDatePicker(true);
  };

  const updateDateRange = (date: string) => {
    if (datePickerType === 'start') {
      setDateRange(prev => ({ ...prev, start: date }));
    } else {
      setDateRange(prev => ({ ...prev, end: date }));
    }
  };

  const generateExpenseStats = () => {
    const stats = { total: 0, byCategory: {} as { [key: string]: number }, highest: { amount: 0, description: '' }, averagePerRoommate: 0 };
    if (expenses.length === 0) return stats;
    expenses.forEach(expense => {
      const amount = Number(expense.amount);
      stats.total += amount;
      if (!stats.byCategory[expense.category]) {
        stats.byCategory[expense.category] = 0;
      }
      stats.byCategory[expense.category] += amount;
      if (amount > stats.highest.amount) {
        stats.highest = { amount: amount, description: expense.description };
      }
    });
    if (roommates.length > 0) {
      stats.averagePerRoommate = stats.total / roommates.length;
    }
    return stats;
  };

  return (
    <AppStateContext.Provider
      value={{
        activeTab,
        setActiveTab,
        handleTabChange,
        expenses,
        setExpenses,
        newExpense,
        setNewExpense,
        roommates,
        setRoommates,
        newRoommate,
        setNewRoommate,
        summaryData,
        settlements,
        categories,
        setCategories,
        isLoading,
        categoryFilter,
        setCategoryFilter,
        dateRange,
        setDateRange,
        showDatePicker,
        setShowDatePicker,
        datePickerType,
        setDatePickerType,
        showCategoryModal,
        setShowCategoryModal,
        newCategoryName,
        setNewCategoryName,
        getFilteredExpenses,
        handleAddExpense,
        handleAddRoommate,
        handleRemoveExpense,
        handleRemoveRoommate,
        handleSplitWithChange,
        openDatePicker,
        updateDateRange,
        confirmAddCategory,
        generateExpenseStats,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};