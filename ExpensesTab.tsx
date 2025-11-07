import React, { useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';
import { ModernButton, ModernCard, ModernInput, Icons } from './ModernUI';
import { exportExpensesToPdf } from './pdfExport_clean';
 
import FilterExpander from './FilterExpander';
import Share from 'react-native-share';
import { openPdfUri } from './src/native/PdfSaver';
import { notifyPdfSaved } from './notifications';
import { db } from './firebase';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

type ExpensesTabProps = {
  tabScrollSimultaneousRef?: any;
};

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
    roommates,
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
  const deviceWidth = Dimensions.get('window').width;
  const columns = deviceWidth >= 380 ? 3 : 2;

  // Ensure parent tab swipe is re-enabled even if a child gesture doesn't report end
  const reenableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChildScrollBegin = () => {
    setTabsScrollEnabled(false);
    if (reenableTimerRef.current) {
      clearTimeout(reenableTimerRef.current);
      reenableTimerRef.current = null;
    }
    reenableTimerRef.current = setTimeout(() => {
      setTabsScrollEnabled(true);
      reenableTimerRef.current = null;
    }, 800);
  };
  const handleChildScrollEnd = () => {
    if (reenableTimerRef.current) {
      clearTimeout(reenableTimerRef.current);
      reenableTimerRef.current = null;
    }
    setTabsScrollEnabled(true);
  };

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

  const styles = StyleSheet.create({
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
    sessionBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8,marginTop: 10, paddingHorizontal: 12, borderRadius: 10 },
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
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExport = useCallback(async () => {
    const allExpenses = expenses; // export full history
    if (!allExpenses || allExpenses.length === 0) {
      Alert.alert('Nothing to Export', 'No expenses found to export.');
      return;
    }

    setIsExporting(true);
    try {
      const { success, filePath, error } = await exportExpensesToPdf(allExpenses as any, settlements as any);
      if (!success) {
        Alert.alert('Export Failed', error || 'Could not create the PDF.');
        return;
      }
      try { await notifyPdfSaved(filePath); } catch {}
      Alert.alert(
        'Exported',
        `PDF saved${filePath ? ` to\n${filePath}` : ''}.`,
        [
          { text: 'OK' },
          { text: 'Open', onPress: async () => {
              if (!filePath) return;
              const isContent = filePath.startsWith('content://');
              if (isContent) {
                try {
                  await openPdfUri(filePath);
                } catch (e: any) {
                  Alert.alert('Open failed', 'No app available to open PDF or permission was denied. Please install a PDF viewer.');
                }
              } else {
                const url = `file://${filePath}`;
                try {
                  await Share.open({ url, type: 'application/pdf', showAppsToView: true });
                } catch {
                  try { await import('react-native').then(m => m.Linking.openURL(url)); } catch {
                    Alert.alert('Open failed', 'Could not open the PDF with any handler.');
                  }
                }
              }
            }
          },
        ]
      );
    } finally {
      setIsExporting(false);
    }
  }, [expenses, settlements]);

  const handleClear = useCallback(async () => {
    const allExpenses = expenses;
    if (!allExpenses || allExpenses.length === 0) {
      Alert.alert('Nothing to Clear', 'No expenses found to clear.');
      return;
    }

    Alert.alert(
      'Clear All Expenses',
      'This will delete all your expenses from Firestore. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
          setIsClearing(true);
          try {
            const expensesRef = collection(db!, 'expenses');
            const idsWithFirestore = (allExpenses as any[]).filter(e => e.firestoreId).map(e => e.firestoreId as string);
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
            Alert.alert('Cleared', 'Expenses cleared.');
          } catch (e) {
            Alert.alert('Error', 'Failed to clear expenses.');
          } finally {
            setIsClearing(false);
          }
        } }
      ]
    );
  }, [expenses]);

  

  if (isLoading) {
    return (
      <View style={[styles.tabContent, { flex: 1, justifyContent: 'center', alignItems: 'center' }] }>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>
          Loading your data...
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.tabContent}
      data={getFilteredExpenses().sort((a, b) => {
        const aCreated = (a as any).createdAt as number | undefined;
        const bCreated = (b as any).createdAt as number | undefined;
        if (typeof aCreated === 'number' && typeof bCreated === 'number') {
          return bCreated - aCreated; // Newest first
        }
        // Fallback to date+time comparison
        const dateA = new Date(a.date + ' ' + a.time).getTime();
        const dateB = new Date(b.date + ' ' + b.time).getTime();
        return dateB - dateA;
      })}
      keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
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
                    {sessions.find(s => s.sessionId === activeSessionId)?.sessionName || 'Not set'}
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
                            onPress={() => {
                              Alert.alert(
                                'Delete Session',
                                'This will delete the session and all its expenses. Continue?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: async () => {
                                    if (isDeletingSessionId) return;
                                    try {
                                      setIsDeletingSessionId(s.sessionId);
                                      const ok = await deleteSession(s.sessionId);
                                      if (!ok) Alert.alert('Failed', 'Could not delete session.');
                                    } finally {
                                      setIsDeletingSessionId(null);
                                    }
                                  } }
                                ]
                              );
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
                        Alert.alert('Name required', 'Please enter a session name.');
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
                          Alert.alert('Failed', 'Could not create session. Please try again.');
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
                    { width: columns === 3 ? '32%' : '48%' },
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
              {/* Select All toggle */}
              <TouchableOpacity
                style={[
                  styles.selectItem,
                  roommates.length > 0 && roommates.every((m) => newExpense.splitWith.includes(m)) && styles.selectedItem,
                  { width: columns === 3 ? '32%' : '48%' },
                ]}
                onPress={() => {
                  const allSelected = roommates.length > 0 && roommates.every((m) => newExpense.splitWith.includes(m));
                  setNewExpense({
                    ...newExpense,
                    splitWith: allSelected ? [] : [...roommates],
                  });
                }}
              >
                <Text
                  style={[
                    styles.selectItemText,
                    roommates.length > 0 && roommates.every((m) => newExpense.splitWith.includes(m)) && styles.selectedItemText,
                  ]}
                >
                  Select All
                </Text>
              </TouchableOpacity>
              {roommates.map((mate) => (
                <TouchableOpacity
                  key={mate}
                  style={[
                    styles.selectItem,
                    newExpense.splitWith.includes(mate) && styles.selectedItem,
                    { width: columns === 3 ? '32%' : '48%' },
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