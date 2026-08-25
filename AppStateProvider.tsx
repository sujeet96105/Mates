import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { db } from './firebase';  // Import Firestore
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppMessage } from './AppMessage';

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
  sessionId?: string;
}

interface Balance {
  paid: number;
  owes: number;
  balance: number;
}

interface SummaryData {
  [friend: string]: Balance;
}

type StoredData = {
  expenses: Expense[];
  friends: string[];
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

// Expense sessions
interface ExpenseSession {
  sessionId: string; // Firestore document ID
  sessionName: string;
  sessionType: string; // e.g., Personal, Trip
  createdDate: number; // epoch millis
  userId: string;
}

// Context value type
interface AppStateContextType {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  handleTabChange: (tab: string) => void;
  tabsScrollEnabled: boolean;
  setTabsScrollEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  newExpense: Expense;
  setNewExpense: React.Dispatch<React.SetStateAction<Expense>>;
  // New naming convention
  friends: string[];
  setFriends: React.Dispatch<React.SetStateAction<string[]>>;
  newFriend: string;
  setNewFriend: React.Dispatch<React.SetStateAction<string>>;
  handleAddFriend: () => void;
  handleRemoveFriend: (mate: string) => void;
  
  // Backward compatibility aliases
  roommates: string[];
  setRoommates: React.Dispatch<React.SetStateAction<string[]>>;
  newRoommate: string;
  setNewRoommate: React.Dispatch<React.SetStateAction<string>>;
  handleAddRoommate: () => void;
  handleRemoveRoommate: (mate: string) => void;
  
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
  handleRemoveExpense: (id?: number) => void;
  handleSplitWithChange: (friend: string) => void;
  openDatePicker: (type: 'start' | 'end') => void;
  updateDateRange: (date: string) => void;
  confirmAddCategory: () => void;
  generateExpenseStats: () => any;
  // Sessions
  sessions: ExpenseSession[];
  activeSessionId: string | null;
  setActiveSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  insertSession: (sessionName: string, sessionType: string) => Promise<string | null>;
  getAllSessions: () => ExpenseSession[];
  getExpensesBySession: (sessionId: string) => Expense[];
  deleteSession: (sessionId: string) => Promise<boolean>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get the current user from AuthProvider
  const { user } = useAuth();
  const { confirm, showMessage } = useAppMessage();
  
  // All state and handlers from App.tsx go here
  const [activeTab, setActiveTab] = useState('expenses');
  const [tabsScrollEnabled, setTabsScrollEnabled] = useState(true);
  
  // Handle tab selection to redirect settlements and statistics to financialInsights
  const handleTabChange = useCallback((tab: string) => {
    // If user tries to access the old tabs, redirect to the new combined tab
    if (tab === 'settlements' || tab === 'statistics') {
      setActiveTab('financialInsights');
    } else {
      setActiveTab(tab);
    }
  }, []);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState<Expense>({
    description: '',
    amount: 0,
    paidBy: '',
    splitWith: [],
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    category: 'Groceries',
  });
  const [friends, setFriends] = useState<string[]>([]);
  const [newFriend, setNewFriend] = useState<string>('');
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

  // Sessions state
  const [sessions, setSessions] = useState<ExpenseSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const insertSessionInternal = useCallback(async (sessionName: string, sessionType: string, uid: string): Promise<string | null> => {
    try {
      const sessionsCol = collection(db!, 'users', uid, 'sessions');
      const newDocRef = doc(sessionsCol);
      const payload: ExpenseSession = {
        sessionId: newDocRef.id,
        sessionName,
        sessionType,
        createdDate: Date.now(),
        userId: uid,
      };
      await setDoc(newDocRef, payload);
      return newDocRef.id;
    } catch (e) {
      console.error('Failed creating session', e);
      return null;
    }
  }, []);

  // Persist active session when it changes
  useEffect(() => {
    if (user && activeSessionId) {
      AsyncStorage.setItem(`mates:user:${user.uid}:activeSessionId`, activeSessionId).catch(() => {});
    }
  }, [activeSessionId, user]);

  // Load data and subscribe to realtime expenses when user changes
  useEffect(() => {
    let unsubscribeExpenses: (() => void) | undefined;
    let unsubscribeUserDoc: (() => void) | undefined;
    let unsubscribeSessions: (() => void) | undefined;
    let unsubscribeActiveSessionDoc: (() => void) | undefined;
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Try local cache first for fast startup
        let cachedFriends: string[] | undefined;
        let cachedCategories: string[] | undefined;
        try {
          const cacheKey = `mates:user:${user.uid}:profile`;
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.roommates)) {
              cachedFriends = parsed.roommates;
              setFriends(parsed.roommates);
            }
            if (Array.isArray(parsed.categories)) {
              cachedCategories = parsed.categories;
              setCategories(parsed.categories);
            }
            console.log('[Cache] Loaded friends/categories from AsyncStorage');
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
              const nextCategories = Array.isArray(data.categories) ? data.categories : undefined;
              if (nextCategories) {
                setCategories(prev => arraysEqual(nextCategories, prev) ? prev : nextCategories);
              }
              // Cache locally
              AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({
                roommates: (data as any).roommates ?? [],
                categories: nextCategories ?? DEFAULT_CATEGORIES,
              })).catch(() => {});
            }
          }, (err) => {
            console.warn('[Firestore] User doc listener error:', err);
          });

          // Load active session from storage
          try {
            const savedActive = await AsyncStorage.getItem(`mates:user:${user.uid}:activeSessionId`);
            if (savedActive) {
              setActiveSessionId(savedActive);
            }
          } catch {}

          // Subscribe to sessions for this user
          const sessionsQueryRef = query(collection(db!, 'users', user.uid, 'sessions'));
          unsubscribeSessions = onSnapshot(sessionsQueryRef, async (snapshot) => {
            const nextSessions: ExpenseSession[] = snapshot.docs.map(d => {
              const data = d.data() as any;
              return {
                sessionId: d.id,
                sessionName: data.sessionName || 'Session',
                sessionType: data.sessionType || 'Personal',
                createdDate: typeof data.createdDate === 'number' ? data.createdDate : Date.now(),
                userId: data.userId,
              };
            });
            setSessions(nextSessions);
            // Ensure there is always an active session
            if (!activeSessionId) {
              const existing = nextSessions[0];
              if (existing) {
                setActiveSessionId(existing.sessionId);
                AsyncStorage.setItem(`mates:user:${user.uid}:activeSessionId`, existing.sessionId).catch(() => {});
              } else {
                // Create default session
                const createdId = await insertSessionInternal('Personal Daily Expenses', 'Personal', user.uid);
                if (createdId) {
                  setActiveSessionId(createdId);
                  AsyncStorage.setItem(`mates:user:${user.uid}:activeSessionId`, createdId).catch(() => {});
                }
              }
            }
          }, (err) => {
            console.warn('[Firestore] Sessions listener error:', err);
          });

          // Subscribe to active session doc for session-scoped friends
          if (activeSessionId) {
            const activeSessionDocRef = doc(db!, 'users', user.uid, 'sessions', activeSessionId);
            unsubscribeActiveSessionDoc = onSnapshot(activeSessionDocRef, async (snap) => {
              const data = snap.data();
              const nextRoommates = Array.isArray(data?.roommates) ? (data!.roommates as string[]) : [];
              setFriends(nextRoommates);
              await AsyncStorage.setItem(`mates:user:${user.uid}:session:${activeSessionId}:friends`, JSON.stringify(nextRoommates));
            }, (err) => {
              console.warn('[Firestore] Active session doc listener error:', err);
            });
          }

          // Realtime expenses subscription scoped to active session
          const expensesQuery = query(
            collection(db!, 'expenses'),
            where('userId', '==', user.uid),
            ...(activeSessionId ? [where('sessionId', '==', activeSessionId)] as any : [])
          );
          console.log('[Firestore] Subscribing to expenses...');
          unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot: QuerySnapshot<DocumentData>) => {
            const expensesData = snapshot.docs.map((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
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
          }, (err: FirestoreError) => {
            console.warn('[Firestore] Expenses listener error:', err);
          });
          // Initialize local state immediately as well (before first snapshot)
          const initialRoommates = Array.isArray(userData.roommates) ? userData.roommates : [];
          const initialCategories = Array.isArray(userData.categories) ? userData.categories : DEFAULT_CATEGORIES;
          setFriends(initialRoommates);
          setCategories(initialCategories);
          // Cache initial fetch
          AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({
            roommates: initialRoommates,
            categories: initialCategories,
          })).catch(() => {});

          // Reconcile: if Firestore has empty roommates but cache has data, push cache to Firestore
          if ((initialRoommates.length === 0) && cachedFriends && cachedFriends.length > 0) {
            try {
              console.log('[Sync] Firestore friends empty; restoring from cache');
              await setDoc(userDocRef, { roommates: cachedFriends, updatedAt: new Date() }, { merge: true });
              setFriends(cachedFriends);
              await AsyncStorage.setItem(`mates:user:${user.uid}:profile`, JSON.stringify({ roommates: cachedFriends, categories: initialCategories.length ? initialCategories : (cachedCategories ?? DEFAULT_CATEGORIES) }));
            } catch (e) {
              console.warn('[Sync] Failed to restore friends from cache', e);
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

          // Create a default session for brand new users
          try {
            const createdId = await insertSessionInternal('Personal Daily Expenses', 'Personal', user.uid);
            if (createdId) {
              setActiveSessionId(createdId);
              AsyncStorage.setItem(`mates:user:${user.uid}:activeSessionId`, createdId).catch(() => {});
            }
          } catch {}
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showMessage({
          title: 'Could not load data',
          message: 'Please try again in a moment.',
          variant: 'error',
        });
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
      if (unsubscribeSessions) {
        unsubscribeSessions();
      }
      if (unsubscribeActiveSessionDoc) {
        unsubscribeActiveSessionDoc();
      }
    };
  }, [user, activeSessionId, insertSessionInternal]);

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

  const summaryData = useMemo<SummaryData>(() => {
    const balances: { [key: string]: Balance } = {};
    friends.forEach((mate) => {
      balances[mate] = { paid: 0, owes: 0, balance: 0 };
    });
    expenses.forEach((expense) => {
      const payer = expense.paidBy;
      const amount = Number(expense.amount);
      const splitWith = expense.splitWith.length > 0 ? expense.splitWith : [...friends];
      const splitAmount = splitWith.length > 0 ? amount / splitWith.length : 0;
      if (balances[payer]) {
        balances[payer].paid += amount;
      }
      splitWith.forEach((mate) => {
        if (balances[mate]) {
          balances[mate].owes += splitAmount;
        }
      });
    });
    friends.forEach((mate) => {
      if (balances[mate]) {
        balances[mate].balance = balances[mate].paid - balances[mate].owes;
      }
    });
    return balances;
  }, [expenses, friends]);

  const settlements = useMemo<SettlementItem[]>(() => {
    const creditors: { name: string; amount: number }[] = [];
    const debtors: { name: string; amount: number }[] = [];
    friends.forEach((mate) => {
      if (summaryData[mate]?.balance > 0) {
        creditors.push({ name: mate, amount: summaryData[mate].balance });
      } else if (summaryData[mate]?.balance < 0) {
        debtors.push({ name: mate, amount: -summaryData[mate].balance });
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
    return settlementItems;
  }, [friends, summaryData]);

  const getFilteredExpenses = useCallback(() => {
    return expenses.filter(expense => {
      // Check if category matches
      let matchesCategory = true;
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Other') {
          const categoriesWithoutOther = categories.filter(c => c !== 'Other');
          // Include items explicitly marked as 'Other' or items whose category is not in the known category list
          matchesCategory = expense.category === 'Other' || !categoriesWithoutOther.includes(expense.category);
        } else {
          matchesCategory = expense.category === categoryFilter;
        }
      }
      
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
  }, [categories, categoryFilter, dateRange.end, dateRange.start, expenses]);

  const handleAddExpense = useCallback(async () => {
    if (!newExpense.description || newExpense.amount <= 0 || !newExpense.paidBy || !user) {
      showMessage({
        title: 'Missing information',
        message: 'Please fill in all required expense fields.',
        variant: 'warning',
      });
      return;
    }
    
    try {
      // Ensure we have a valid sessionId
      let sid: string | null = activeSessionId || null;
      if (!sid) {
        if (sessions.length > 0) {
          sid = sessions[0].sessionId;
          setActiveSessionId(sid);
        } else {
          sid = await insertSessionInternal('Personal Daily Expenses', 'Personal', user.uid);
          if (sid) {
            setActiveSessionId(sid);
          }
        }
      }
      if (!sid) {
        showMessage({
          title: 'Session required',
          message: 'Create or select a session before adding expenses.',
          variant: 'warning',
        });
        return;
      }
      // Create a new expense document in Firestore
      const expensesCollectionRef = collection(db!, 'expenses');
      const newExpenseRef = doc(expensesCollectionRef);
      
      const expenseToAdd: Expense = {
        ...newExpense,
        id: Date.now(), // Keep numeric ID for local operations
        userId: user.uid,
        sessionId: sid,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        firestoreId: newExpenseRef.id, // Store Firestore document ID
        createdAt: Date.now()
      };
      
      // Save to Firestore
      await setDoc(newExpenseRef, expenseToAdd);
      
      // Update local state
      setExpenses(prev => [...prev, expenseToAdd]);
      setNewExpense({ description: '', amount: 0, paidBy: '', splitWith: [], date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString(), category: 'Groceries' });
    } catch (error) {
      console.error('Error adding expense:', error);
      showMessage({
        title: 'Expense not added',
        message: 'Please try again.',
        variant: 'error',
      });
    }
  }, [activeSessionId, insertSessionInternal, newExpense, sessions, showMessage, user]);

  const insertSession = useCallback(async (sessionName: string, sessionType: string): Promise<string | null> => {
    if (!user) return null;
    const id = await insertSessionInternal(sessionName, sessionType, user.uid);
    if (id) {
      setActiveSessionId(id);
      AsyncStorage.setItem(`mates:user:${user.uid}:activeSessionId`, id).catch(() => {});
    }
    return id;
  }, [insertSessionInternal, user]);

  const getAllSessions = useCallback(() => sessions, [sessions]);
  const getExpensesBySession = useCallback((sessionId: string) => expenses.filter(e => e.sessionId === sessionId), [expenses]);

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      // 1) Delete expenses for this session (belonging to this user)
      const expensesRef = collection(db!, 'expenses');
      const q = query(expensesRef, where('userId', '==', user.uid), where('sessionId', '==', sessionId));
      const snap = await getDocs(q);
      const deletePromises: Promise<any>[] = [];
      snap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      if (deletePromises.length) await Promise.all(deletePromises);

      // 2) Delete the session document
      const sessionDocRef = doc(db!, 'users', user.uid, 'sessions', sessionId);
      await deleteDoc(sessionDocRef);

      // 3) If deleting the active session, switch to another one when listener updates
      if (activeSessionId === sessionId) {
        const fallback = sessions.find(s => s.sessionId !== sessionId)?.sessionId || null;
        setActiveSessionId(fallback);
        if (fallback) {
          await AsyncStorage.setItem(`mates:user:${user.uid}:activeSessionId`, fallback);
        } else {
          await AsyncStorage.removeItem(`mates:user:${user.uid}:activeSessionId`);
        }
      }
      return true;
    } catch (e) {
      console.warn('Failed to delete session', e);
      return false;
    }
  }, [activeSessionId, sessions, user]);

  const confirmAddCategory = useCallback(() => {
    if (newCategoryName && newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
      setShowCategoryModal(false);
    } else if (categories.includes(newCategoryName.trim())) {
      showMessage({
        title: 'Duplicate category',
        message: 'This category already exists.',
        variant: 'warning',
      });
    }
  }, [categories, newCategoryName, showMessage]);

  const handleAddFriend = useCallback(async () => {
    if (!newFriend.trim()) {
      showMessage({
        title: 'Friend name required',
        message: 'Please enter a friend name.',
        variant: 'warning',
      });
      return;
    }
    if (friends.includes(newFriend.trim())) {
      showMessage({
        title: 'Duplicate friend',
        message: 'This friend already exists.',
        variant: 'warning',
      });
      return;
    }
    const updatedFriends = [...friends, newFriend.trim()];
    setFriends(updatedFriends);
    setNewFriend('');
    try {
      if (user && activeSessionId) {
        const sessionDocRef = doc(db!, 'users', user.uid, 'sessions', activeSessionId);
        await setDoc(sessionDocRef, { roommates: updatedFriends, updatedAt: new Date() }, { merge: true });
        await AsyncStorage.setItem(`mates:user:${user.uid}:session:${activeSessionId}:friends`, JSON.stringify(updatedFriends));
      }
    } catch (error) {
      console.warn('Failed to persist friend add:', error);
    }
  }, [activeSessionId, friends, newFriend, showMessage, user]);

  // Backward compatibility alias
  const handleAddRoommate = handleAddFriend;

  const handleRemoveExpense = useCallback((id?: number) => {
    if (!id || !user) return;
    
    // Find the expense in our local state first
    const expenseToDelete = expenses.find(expense => expense.id === id);
    if (!expenseToDelete) {
      showMessage({
        title: 'Expense not found',
        message: 'Could not find the expense to delete.',
        variant: 'error',
      });
      return;
    }
    
    confirm({
      title: 'Delete expense?',
      message: 'This expense will be removed from your history.',
      confirmLabel: 'Delete',
      destructive: true,
    }).then(async (shouldDelete) => {
      if (!shouldDelete) return;

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
          showMessage({
            title: 'Delete failed',
            message: 'Failed to remove expense. Please try again.',
            variant: 'error',
          });
        }
    });
  }, [confirm, expenses, showMessage, user]);

  const handleRemoveFriend = useCallback((mate: string) => {
    confirm({
      title: 'Remove friend?',
      message: 'This will affect expense calculations.',
      confirmLabel: 'Remove',
      destructive: true,
    }).then(async (shouldRemove) => {
      if (!shouldRemove) return;

      const updatedFriends = friends.filter(friend => friend !== mate);
      setFriends(updatedFriends);
      try {
        if (user && activeSessionId) {
          const sessionDocRef = doc(db!, 'users', user.uid, 'sessions', activeSessionId);
          await setDoc(sessionDocRef, { roommates: updatedFriends, updatedAt: new Date() }, { merge: true });
          await AsyncStorage.setItem(`mates:user:${user.uid}:session:${activeSessionId}:friends`, JSON.stringify(updatedFriends));
        }
      } catch (error) {
        console.warn('Failed to persist friend removal:', error);
        showMessage({
          title: 'Friend removed locally',
          message: 'Sync failed. We will try again when data refreshes.',
          variant: 'warning',
        });
      }
    });
  }, [activeSessionId, confirm, friends, showMessage, user]);

  // Backward compatibility alias
  const handleRemoveRoommate = handleRemoveFriend;

  const handleSplitWithChange = useCallback((mate: string) => {
    const updatedSplitWith = [...newExpense.splitWith];
    if (updatedSplitWith.includes(mate)) {
      const index = updatedSplitWith.indexOf(mate);
      updatedSplitWith.splice(index, 1);
    } else {
      updatedSplitWith.push(mate);
    }
    setNewExpense({ ...newExpense, splitWith: updatedSplitWith });
  }, [newExpense]);

  const openDatePicker = useCallback((type: 'start' | 'end') => {
    setDatePickerType(type);
    setShowDatePicker(true);
  }, []);

  const updateDateRange = useCallback((date: string) => {
    if (datePickerType === 'start') {
      setDateRange(prev => ({ ...prev, start: date }));
    } else {
      setDateRange(prev => ({ ...prev, end: date }));
    }
  }, [datePickerType]);

  const generateExpenseStats = useCallback(() => {
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
    if (friends.length > 0) {
      stats.averagePerRoommate = stats.total / friends.length;
    }
    return stats;
  }, [expenses, friends.length]);

  const contextValue = useMemo<AppStateContextType>(() => ({
    activeTab,
    setActiveTab,
    handleTabChange,
    tabsScrollEnabled,
    setTabsScrollEnabled,
    expenses,
    setExpenses,
    newExpense,
    setNewExpense,
    // New naming convention
    friends,
    setFriends,
    newFriend,
    setNewFriend,
    handleAddFriend,
    handleRemoveFriend,
    // Backward compatibility aliases
    roommates: friends,
    setRoommates: setFriends,
    newRoommate: newFriend,
    setNewRoommate: setNewFriend,
    handleAddRoommate,
    handleRemoveRoommate,

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
    handleRemoveExpense,
    handleSplitWithChange,
    openDatePicker,
    updateDateRange,
    confirmAddCategory,
    generateExpenseStats,
    // Sessions
    sessions,
    activeSessionId,
    setActiveSessionId,
    insertSession,
    getAllSessions,
    getExpensesBySession,
    deleteSession,
  }), [
    activeSessionId,
    activeTab,
    categories,
    categoryFilter,
    confirmAddCategory,
    datePickerType,
    dateRange,
    deleteSession,
    expenses,
    friends,
    generateExpenseStats,
    getAllSessions,
    getExpensesBySession,
    getFilteredExpenses,
    handleAddExpense,
    handleAddFriend,
    handleAddRoommate,
    handleRemoveExpense,
    handleRemoveFriend,
    handleRemoveRoommate,
    handleSplitWithChange,
    handleTabChange,
    insertSession,
    isLoading,
    newCategoryName,
    newExpense,
    newFriend,
    openDatePicker,
    sessions,
    settlements,
    showCategoryModal,
    showDatePicker,
    summaryData,
    tabsScrollEnabled,
    updateDateRange,
  ]);

  return (
    <AppStateContext.Provider
      value={contextValue}
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
