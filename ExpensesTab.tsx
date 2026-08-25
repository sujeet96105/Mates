import React, { memo, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';
import { ModernButton, ModernCard, ModernInput, Icons } from './ModernUI';
import { exportExpensesToPdf } from './pdfExport_clean';
import { ExpenseItemSkeleton } from './LoadingSkeleton';

import FilterExpander from './FilterExpander';
import Share from 'react-native-share';
import { openPdfUri } from './src/native/PdfSaver';
import { notifyPdfSaved } from './notifications';
import { db } from './firebase';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useAppMessage } from './AppMessage';

type ExpensesTabProps = {
  tabScrollSimultaneousRef?: any;
};

type ExpenseListItemProps = {
  item: any;
  styles: any;
  onRemoveExpense: (id?: number) => void;
};

const getExpenseSortTime = (expense: any) => {
  if (typeof expense.createdAt === 'number') {
    return expense.createdAt;
  }
  return new Date(`${expense.date} ${expense.time}`).getTime();
};

const getExpenseKey = (item: any) => {
  // Priority 1: Use Firestore ID (guaranteed unique)
  if (item.firestoreId) {
    return item.firestoreId;
  }

  // Priority 2: Use numeric ID with prefix to ensure string uniqueness
  if (item.id) {
    return `expense-${item.id}`;
  }

  // Priority 3: Create a more robust composite key with timestamp
  // Include createdAt or fallback to a hash-like key to prevent collisions
  const timestamp = item.createdAt || new Date(`${item.date} ${item.time}`).getTime() || Date.now();
  return `${item.date}-${item.time}-${item.description}-${item.amount}-${item.paidBy}-${timestamp}`;
};

const AnimatedExpenseView = Animated.createAnimatedComponent(View) as React.ComponentType<any>;

const ExpenseListItem = memo(({ item, styles, onRemoveExpense }: ExpenseListItemProps) => {
  const amount = Number(item.amount || 0);

  return (
    <AnimatedExpenseView
      entering={FadeInUp.duration(180)}
      layout={LinearTransition.duration(180)}
      style={styles.expenseItem}
    >
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        <Text style={styles.expenseAmount}>Rs {amount.toFixed(2)}</Text>
      </View>
      <Text style={styles.expenseDetails}>Paid by: {item.paidBy}</Text>
      <Text style={styles.expenseDetails}>Split with: {Array.isArray(item.splitWith) ? item.splitWith.join(', ') : ''}</Text>
      <Text style={styles.expenseDate}>{item.date} {item.time}</Text>
      <Text style={styles.expenseDetails}>Category: {item.category}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => item.id && onRemoveExpense(item.id)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </AnimatedExpenseView>
  );
});

const ExpensesTab: React.FC<ExpensesTabProps> = ({ tabScrollSimultaneousRef }) => {
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
    friends,
    handleSplitWithChange,
    handleAddExpense,
    getFilteredExpenses,
    handleRemoveExpense,
    tabsScrollEnabled,
    setTabsScrollEnabled,
    expenses,
    settlements,
    sessions,
    activeSessionId,
    setActiveSessionId,
    insertSession,
    deleteSession,
  } = useAppState();

  // Use our custom theme hook for consistent theming
  const { isDarkMode, colors } = useTheme();
  const { confirm, showMessage } = useAppMessage();
  const deviceWidth = Dimensions.get('window').width;
  const columns = deviceWidth >= 380 ? 3 : 2;

  // Ensure parent tab swipe is re-enabled even if a child gesture doesn't report end
  const reenableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChildScrollBegin = useCallback(() => {
    setTabsScrollEnabled(false);
    if (reenableTimerRef.current) {
      clearTimeout(reenableTimerRef.current);
      reenableTimerRef.current = null;
    }
    reenableTimerRef.current = setTimeout(() => {
      setTabsScrollEnabled(true);
      reenableTimerRef.current = null;
    }, 800);
  }, [setTabsScrollEnabled]);
  const handleChildScrollEnd = useCallback(() => {
    if (reenableTimerRef.current) {
      clearTimeout(reenableTimerRef.current);
      reenableTimerRef.current = null;
    }
    setTabsScrollEnabled(true);
  }, [setTabsScrollEnabled]);

  // Show custom category input when "Other" is selected in Add Expense
  const [showCustomCategory, setShowCustomCategory] = useState(newExpense.category === 'Other');
  // Ensure default selected category button is Groceries when mounting
  React.useEffect(() => {
    if (!newExpense.category) {
      setNewExpense({ ...newExpense, category: 'Groceries' });
    }
  }, []);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionType, setNewSessionType] = useState<'Personal' | 'Trip'>('Personal');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDeletingSessionId, setIsDeletingSessionId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const previousExpenseCountRef = useRef(expenses.length);

  React.useEffect(() => {
    if (expenses.length > previousExpenseCountRef.current) {
      setAmountInput('');
    }
    previousExpenseCountRef.current = expenses.length;
  }, [expenses.length]);

  const handleAmountChange = (text: string) => {
    const normalizedText = text.replace(',', '.');
    if (!/^\d*\.?\d{0,2}$/.test(normalizedText)) {
      return;
    }

    setAmountInput(normalizedText);
    const amount = normalizedText === '' || normalizedText === '.'
      ? 0
      : Number(normalizedText);
    setNewExpense({ ...newExpense, amount });
  };

  const styles = useMemo(() => StyleSheet.create({
    tabContent: { padding: 20, flex: 1, backgroundColor: colors.backgroundSecondary },
    filterContainer: { 
      marginBottom: 20, 
      backgroundColor: colors.card, 
      padding: 20, 
      borderRadius: 16, 
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1, 
      borderColor: colors.borderLight,
      position: 'relative' as const
    },
    filterTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12, letterSpacing: -0.3 },
    label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 },
    selectItem: { 
      borderWidth: 1, 
      borderColor: colors.border, 
      borderRadius: 12, 
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface, 
      minWidth: 90, 
      alignItems: 'center', 
      margin: 6,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2
    },
    selectedItem: { backgroundColor: colors.primary, borderColor: colors.primary },
    selectItemText: { color: colors.text, fontSize: 14, fontWeight: '500' },
    selectedItemText: { color: colors.textOnPrimary, fontWeight: '600' },
    dateRangeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 },
    dateButton: { 
      flex: 1, 
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface, 
      borderRadius: 12, 
      alignItems: 'center', 
      borderWidth: 1, 
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2
    },
    dateButtonText: { color: colors.text, fontSize: 14, fontWeight: '500' },
    card: { 
      backgroundColor: colors.card, 
      borderRadius: 16, 
      padding: 20, 
      marginBottom: 20, 
      shadowColor: colors.shadow, 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 8, 
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.borderLight
    },
    cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16, letterSpacing: -0.3 },
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
      elevation: 1
    },
    dropdown: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      marginBottom: 12,
    },
    dropdownText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    addButton: { 
      backgroundColor: colors.primary, 
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12, 
      alignItems: 'center', 
      marginTop: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4
    },
    addButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16, letterSpacing: 0.5 },
    selectContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 4 },
    categoryModalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    categoryModalContent: {
      width: '90%',
      maxHeight: '70%',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    pickerItem: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    pickerItemText: {
      fontSize: 16,
      color: colors.text,
    },
    sessionHeader: { flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap' as const },
    sessionBadge: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, maxWidth: '100%', flexShrink: 1 },
    sessionActions: { flexDirection: 'row', flexShrink: 0, flexWrap: 'wrap' as const, gap: 8, marginTop: 8, alignItems: 'center' },
    sessionBtn: { 
      backgroundColor: colors.surface,
      borderWidth: 1, 
      borderColor: colors.border, 
      paddingVertical: 8,
      marginTop: 10, 
      paddingHorizontal: 12,
      marginRight: 8,
      borderRadius: 10 
    },
    sessionBtnText: { color: colors.text, fontWeight: '600' },
    topRightIcon: { position: 'absolute', top: 12, right: 12 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalCard: { width: '92%', backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
    modalRow: { flexDirection: 'row', marginTop: 8 },
    typeChip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.surface },
    typeChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeChipText: { color: colors.text, fontWeight: '600' },
    typeChipTextSelected: { color: colors.textOnPrimary },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
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
      borderColor: colors.borderLight
    },
    expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    expenseDescription: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
    expenseAmount: { fontSize: 18, fontWeight: '700', color: colors.success },
    expenseDetails: { fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
    expenseDate: { fontSize: 12, color: colors.textTertiary, marginBottom: 8 },
    deleteButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, marginTop: 8, backgroundColor: colors.errorLight, borderRadius: 8 },
    deleteButtonText: { color: colors.error, fontSize: 14, fontWeight: '600' },
    emptyMessage: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 16, fontWeight: '500' },
    actionsRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    exportButton: { flex: 1, backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', flexDirection: 'row', marginBottom: 24 },
    exportButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
    clearButton: { flex: 1, backgroundColor: colors.error, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', flexDirection: 'row', marginBottom: 24 },
    clearButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  }), [colors]);

  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExport = useCallback(async () => {
    const allExpenses = expenses; // export full history
    if (!allExpenses || allExpenses.length === 0) {
      showMessage({
        title: 'Nothing to export',
        message: 'No expenses found to export.',
        variant: 'info',
      });
      return;
    }

    setIsExporting(true);
    try {
      const { success, filePath, error } = await exportExpensesToPdf(allExpenses as any, settlements as any);
      if (!success) {
        showMessage({
          title: 'Export failed',
          message: error || 'Could not create the PDF.',
          variant: 'error',
        });
        return;
      }
      try { await notifyPdfSaved(filePath); } catch {}
      showMessage({
        title: 'PDF exported',
        message: filePath ? `Saved to ${filePath}` : 'Your PDF is ready.',
        variant: 'success',
        durationMs: 6000,
        actionLabel: filePath ? 'Open' : undefined,
        onAction: async () => {
          if (!filePath) return;
          const isContent = filePath.startsWith('content://');
          if (isContent) {
            try {
              await openPdfUri(filePath);
            } catch {
              showMessage({
                title: 'Open failed',
                message: 'No PDF viewer was available or permission was denied.',
                variant: 'error',
              });
            }
            return;
          }

          const url = `file://${filePath}`;
          try {
            await Share.open({ url, type: 'application/pdf', showAppsToView: true });
          } catch {
            try {
              const { Linking } = await import('react-native');
              await Linking.openURL(url);
            } catch {
              showMessage({
                title: 'Open failed',
                message: 'Could not open the PDF with any handler.',
                variant: 'error',
              });
            }
          }
        },
      });
    } finally {
      setIsExporting(false);
    }
  }, [expenses, settlements, showMessage]);

  const handleClear = useCallback(async () => {
    const allExpenses = expenses;
    if (!allExpenses || allExpenses.length === 0) {
      showMessage({
        title: 'Nothing to clear',
        message: 'No expenses found to clear.',
        variant: 'info',
      });
      return;
    }

    const shouldClear = await confirm({
      title: 'Clear all expenses?',
      message: 'This will delete all your expenses from Firestore. This action cannot be undone.',
      confirmLabel: 'Clear',
      destructive: true,
    });

    if (!shouldClear) return;

    setIsClearing(true);
    try {
      const expensesRef = collection(db!, 'expenses');
      const idsWithFirestore = (allExpenses as any[])
        .filter(e => e.firestoreId)
        .map(e => e.firestoreId as string);

      if (idsWithFirestore.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < idsWithFirestore.length; i += 300) {
          chunks.push(idsWithFirestore.slice(i, i + 300));
        }
        for (const chunk of chunks) {
          await Promise.all(chunk.map(id => deleteDoc(doc(expensesRef, id))));
        }
      } else {
        const numericIds = (allExpenses as any[]).map(e => e.id).filter(Boolean);
        if (numericIds.length > 0) {
          const sliceSize = 10;
          for (let i = 0; i < numericIds.length; i += sliceSize) {
            const slice = numericIds.slice(i, i + sliceSize);
            const q = query(expensesRef, where('id', 'in', slice));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
          }
        }
      }

      showMessage({
        title: 'Expenses cleared',
        message: 'Your expense history is now empty.',
        variant: 'success',
      });
    } catch {
      showMessage({
        title: 'Clear failed',
        message: 'Failed to clear expenses.',
        variant: 'error',
      });
    } finally {
      setIsClearing(false);
    }
  }, [confirm, expenses, showMessage]);

  const visibleExpenses = useMemo(() => {
    const filtered = getFilteredExpenses();
    const seen = new Set<string>();
    const unique = filtered.filter(item => {
      const key = getExpenseKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.sort((a, b) => getExpenseSortTime(b) - getExpenseSortTime(a));
  }, [getFilteredExpenses]);

  const activeSessionName = useMemo(() => {
    return sessions.find(s => s.sessionId === activeSessionId)?.sessionName || 'Not set';
  }, [activeSessionId, sessions]);

  const renderExpenseItem = useCallback(({ item }: { item: any }) => (
    <ExpenseListItem
      item={item}
      styles={styles}
      onRemoveExpense={handleRemoveExpense}
    />
  ), [handleRemoveExpense, styles]);

  if (isLoading) {
    return (
      <View style={[styles.tabContent, { flex: 1 }]}>
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Loading...</Text>
        </View>
        <ExpenseItemSkeleton />
        <ExpenseItemSkeleton />
        <ExpenseItemSkeleton />
        <ExpenseItemSkeleton />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.tabContent}
      data={visibleExpenses}
      keyExtractor={getExpenseKey}
      renderItem={renderExpenseItem}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews
      ListHeaderComponent={
        <>
          {/* Filter Section (compact with icon) */}
          <View style={styles.filterContainer}>
            <View style={styles.topRightIcon}>
              <FilterExpander
                categories={categories}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
                openDatePicker={openDatePicker}
                tabScrollSimultaneousRef={tabScrollSimultaneousRef}
                onChildScrollBegin={handleChildScrollBegin}
                onChildScrollEnd={handleChildScrollEnd}
              />
            </View>
          
            <View style={styles.sessionHeader}>
              <View>
                <Text style={styles.filterTitle}>Active Session</Text>
                <View style={styles.sessionBadge}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {activeSessionName}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionActions}>
                <TouchableOpacity style={styles.sessionBtn} onPress={() => setShowSessionModal(true)}>
                  <Text style={styles.sessionBtnText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sessionBtn} onPress={() => { setNewSessionName(''); setNewSessionType('Personal'); setShowSessionModal(true); }}>
                  <Text style={styles.sessionBtnText}>New</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {/* Session chooser / creator modal */}
          <Modal transparent visible={showSessionModal} animationType="fade" onRequestClose={() => setShowSessionModal(false)}>
            <View style={styles.modalBg}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select or Create Session</Text>
                <View style={{ maxHeight: 200, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, overflow: 'hidden' }}>
                  <ScrollView>
                    {sessions.length === 0 ? (
                      <Text style={{ color: colors.textSecondary, padding: 12 }}>No sessions yet</Text>
                    ) : (
                      sessions.map(s => (
                        <View key={s.sessionId} style={[styles.pickerItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                          <TouchableOpacity onPress={async () => { setActiveSessionId(s.sessionId); setShowSessionModal(false); }}>
                            <Text style={styles.pickerItemText}>{s.sessionName} ({s.sessionType})</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={async () => {
                              if (isDeletingSessionId) return;
                              const shouldDelete = await confirm({
                                title: 'Delete session?',
                                message: 'This will delete the session and all its expenses.',
                                confirmLabel: 'Delete',
                                destructive: true,
                              });
                              if (!shouldDelete) return;

                              try {
                                setIsDeletingSessionId(s.sessionId);
                                const ok = await deleteSession(s.sessionId);
                                if (!ok) {
                                  showMessage({
                                    title: 'Delete failed',
                                    message: 'Could not delete session.',
                                    variant: 'error',
                                  });
                                }
                              } finally {
                                setIsDeletingSessionId(null);
                              }
                            }}
                            disabled={isDeletingSessionId === s.sessionId}
                          >
                            <Text style={{ color: colors.error }}>{isDeletingSessionId === s.sessionId ? 'Deleting…' : 'Delete'}</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>
                <Text style={[styles.label, { marginTop: 12 }]}>New Session</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Session name (e.g., Trip to Goa)"
                  placeholderTextColor={colors.textPlaceholder}
                  value={newSessionName}
                  onChangeText={setNewSessionName}
                />
                <View style={styles.modalRow}>
                  {(['Personal','Trip'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.typeChip, newSessionType === t && styles.typeChipSelected]} onPress={() => setNewSessionType(t)}>
                      <Text style={[styles.typeChipText, newSessionType === t && styles.typeChipTextSelected]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.sessionBtn} onPress={() => setShowSessionModal(false)}>
                    <Text style={styles.sessionBtnText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sessionBtn, { borderColor: colors.primary, opacity: isCreatingSession ? 0.6 : 1 }]}
                    onPress={async () => {
                      if (isCreatingSession) return;
                      const name = newSessionName.trim();
                      if (!name) {
                        showMessage({
                          title: 'Name required',
                          message: 'Please enter a session name.',
                          variant: 'warning',
                        });
                        return;
                      }
                      try {
                        setIsCreatingSession(true);
                        const id = await insertSession(name, newSessionType);
                        if (id) {
                          setShowSessionModal(false);
                          setNewSessionName('');
                          setNewSessionType('Personal');
                        } else {
                          showMessage({
                            title: 'Session not created',
                            message: 'Could not create session. Please try again.',
                            variant: 'error',
                          });
                        }
                      } finally {
                        setIsCreatingSession(false);
                      }
                    }}
                  >
                    <Text style={[styles.sessionBtnText]}>{isCreatingSession ? 'Creating…' : 'Create'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
              keyboardType="decimal-pad"
              value={amountInput}
              onChangeText={handleAmountChange}
            />
            <Text style={styles.label}>Paid By:</Text>
            <View style={styles.selectContainer}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend}
                  style={[
                    styles.selectItem,
                    newExpense.paidBy === friend && styles.selectedItem,
                    { width: columns === 3 ? '32%' : '48%' },
                  ]}
                  onPress={() => setNewExpense({ ...newExpense, paidBy: friend })}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      newExpense.paidBy === friend && styles.selectedItemText,
                    ]}
                  >
                    {friend}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Split With:</Text>
            <View style={styles.selectContainer}>
              {/* Select All toggle */}
              <TouchableOpacity
                style={[
                  styles.selectItem,
                  friends.length > 0 && friends.every((f) => newExpense.splitWith.includes(f)) && styles.selectedItem,
                  { width: columns === 3 ? '32%' : '48%' },
                ]}
                onPress={() => {
                  const allSelected = friends.length > 0 && friends.every((f) => newExpense.splitWith.includes(f));
                  setNewExpense({
                    ...newExpense,
                    splitWith: allSelected ? [] : [...friends],
                  });
                }}
              >
                <Text
                  style={[
                    styles.selectItemText,
                    friends.length > 0 && friends.every((f) => newExpense.splitWith.includes(f)) && styles.selectedItemText,
                  ]}
                >
                  Select All
                </Text>
              </TouchableOpacity>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend}
                  style={[
                    styles.selectItem,
                    newExpense.splitWith.includes(friend) && styles.selectedItem,
                    { width: columns === 3 ? '32%' : '48%' },
                  ]}
                  onPress={() => handleSplitWithChange(friend)}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      newExpense.splitWith.includes(friend) && styles.selectedItemText,
                    ]}
                  >
                    {friend}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Category:</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowCategorySelector(prev => !prev)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>
                {newExpense.category || 'Select category'}
              </Text>
            </TouchableOpacity>
            {showCategorySelector && (
              <View style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.borderLight,
                borderRadius: 12,
                marginTop: 8,
                overflow: 'hidden'
              }}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                    onPress={() => {
                      if (category === 'Other') {
                        setShowCustomCategory(true);
                        setCustomCategoryText('');
                        setNewExpense({ ...newExpense, category: 'Other' });
                      } else {
                        setShowCustomCategory(false);
                        setCustomCategoryText('');
                        setNewExpense({ ...newExpense, category });
                      }
                      setShowCategorySelector(false);
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 16 }}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {showCustomCategory && (
              <TextInput
                style={styles.input}
                placeholder="Enter custom category (optional)"
                placeholderTextColor={colors.textPlaceholder}
                value={customCategoryText}
                onChangeText={(text) => {
                  setCustomCategoryText(text);
                  setNewExpense({ ...newExpense, category: text.trim().length ? text : 'Other' });
                }}
              />
            )}
            <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
              <Text style={styles.addButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
          {/* Actions near history */}
          <View style={styles.actionsRow}>
            {isExporting ? (
              <ActivityIndicator />
            ) : (
              <TouchableOpacity style={styles.exportButton} onPress={handleExport} activeOpacity={0.9}>
                <Text style={styles.exportButtonText}>Export</Text>
              </TouchableOpacity>
            )}
            {isClearing ? (
              <ActivityIndicator />
            ) : (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.9}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      }
      ListEmptyComponent={
        <Text style={styles.emptyMessage}>No expenses to show</Text>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={true}
    />
  );
};

export default ExpensesTab;
