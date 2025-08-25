import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

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
  // All state and handlers from App.tsx go here
  const [activeTab, setActiveTab] = useState('expenses');
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

  // Load data from AsyncStorage on initial render
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const jsonData = await AsyncStorage.getItem('mates-data');
        if (jsonData) {
          const data: StoredData = JSON.parse(jsonData);
          setExpenses(data.expenses || []);
          setRoommates(data.roommates || []);
          setCategories(data.categories || DEFAULT_CATEGORIES);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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

  // Save data to AsyncStorage when expenses or roommates change
  useEffect(() => {
    const saveData = async () => {
      try {
        const data: StoredData = {
          expenses,
          roommates,
          categories,
        };
        await AsyncStorage.setItem('mates-data', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    };
    saveData();
  }, [expenses, roommates, categories]);

  // Calculate balances whenever expenses or roommates change
  useEffect(() => {
    calculateBalances();
  }, [expenses, roommates]);

  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
      const expenseDate = new Date(expense.date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
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

  const handleAddExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0 || !newExpense.paidBy) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }
    const expenseToAdd: Expense = {
      ...newExpense,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
    };
    setExpenses([...expenses, expenseToAdd]);
    setNewExpense({ description: '', amount: 0, paidBy: '', splitWith: [], date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString(), category: 'Other' });
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

  const handleAddRoommate = () => {
    if (!newRoommate.trim()) {
      Alert.alert('Missing Information', 'Please enter a roommate name');
      return;
    }
    if (roommates.includes(newRoommate.trim())) {
      Alert.alert('Duplicate Roommate', 'This roommate already exists');
      return;
    }
    setRoommates([...roommates, newRoommate.trim()]);
    setNewRoommate('');
  };

  const handleRemoveExpense = (id?: number) => {
    if (!id) return;
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', onPress: () => { const updatedExpenses = expenses.filter(expense => expense.id !== id); setExpenses(updatedExpenses); }, style: 'destructive' },
    ]);
  };

  const handleRemoveRoommate = (mate: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this roommate? This will affect expense calculations.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: () => { const updatedRoommates = roommates.filter(roommate => roommate !== mate); setRoommates(updatedRoommates); }, style: 'destructive' },
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