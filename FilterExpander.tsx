import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './useTheme';

type Props = {
  categories: string[];
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (r: { start: string; end: string }) => void;
  openDatePicker: (which: 'start' | 'end') => void;
  tabScrollSimultaneousRef?: any;
  onChildScrollBegin: () => void;
  onChildScrollEnd: () => void;
};

const FilterExpander: React.FC<Props> = ({
  categories,
  categoryFilter,
  setCategoryFilter,
  dateRange,
  setDateRange,
  openDatePicker,
  tabScrollSimultaneousRef,
  onChildScrollBegin,
  onChildScrollEnd,
}) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const styles = StyleSheet.create({
    iconButton: {
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalCard: { width: '92%', maxHeight: '80%', backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight },
    title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
    label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 },
    dateButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    dateButtonText: { color: colors.text, fontSize: 14, fontWeight: '500' },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.surface, minWidth: 90, alignItems: 'center', margin: 6 },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
    chipTextSelected: { color: colors.textOnPrimary, fontWeight: '600' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
    actionBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginLeft: 8 },
  });

  return (
    <>
      <TouchableOpacity style={styles.iconButton} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M4 8V5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V8M4 8H20M4 8L9.28632 14.728C9.42475 14.9042 9.5 15.1218 9.5 15.3459V18.4612C9.5 19.1849 10.2449 19.669 10.9061 19.375L13.4061 18.2639C13.7673 18.1034 14 17.7453 14 17.3501V15.3699C14 15.1312 14.0854 14.9004 14.2407 14.7191L20 8" stroke={colors.text} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Filter Expenses</Text>

            <Text style={styles.label}>Category:</Text>
            <GHScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              directionalLockEnabled
              scrollEventThrottle={16}
              decelerationRate="fast"
              onScrollBeginDrag={onChildScrollBegin}
              onScrollEndDrag={onChildScrollEnd}
              onMomentumScrollEnd={onChildScrollEnd}
              onTouchEndCapture={onChildScrollEnd}
              // @ts-ignore
              simultaneousHandlers={tabScrollSimultaneousRef}
            >
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[styles.chip, categoryFilter === 'All' && styles.chipSelected]}
                  onPress={() => { setCategoryFilter('All'); onChildScrollEnd(); }}
                >
                  <Text style={[styles.chipText, categoryFilter === 'All' && styles.chipTextSelected]}>All</Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.chip, categoryFilter === category && styles.chipSelected]}
                    onPress={() => { setCategoryFilter(category); onChildScrollEnd(); }}
                  >
                    <Text style={[styles.chipText, categoryFilter === category && styles.chipTextSelected]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GHScrollView>

            <Text style={[styles.label, { marginTop: 12 }]}>Date Range:</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('start')}>
                <Text style={styles.dateButtonText}>{dateRange.start}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('end')}>
                <Text style={styles.dateButtonText}>{dateRange.end}</Text>
              </TouchableOpacity>
            </View>

            <GHScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
              nestedScrollEnabled
              directionalLockEnabled
              scrollEventThrottle={16}
              decelerationRate="fast"
              onScrollBeginDrag={onChildScrollBegin}
              onScrollEndDrag={onChildScrollEnd}
              onMomentumScrollEnd={onChildScrollEnd}
              onTouchEndCapture={onChildScrollEnd}
              // @ts-ignore
              simultaneousHandlers={tabScrollSimultaneousRef}
            >
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[styles.chip, { marginRight: 8 }]}
                  onPress={() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
                    setDateRange({ start: weekAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                    onChildScrollEnd();
                  }}
                >
                  <Text style={styles.chipText}>Last 7 days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, { marginRight: 8 }]}
                  onPress={() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);
                    setDateRange({ start: monthAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                    onChildScrollEnd();
                  }}
                >
                  <Text style={styles.chipText}>Last 30 days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, { marginRight: 8 }]}
                  onPress={() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const yearAgo = new Date(today); yearAgo.setFullYear(today.getFullYear() - 1);
                    setDateRange({ start: yearAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
                    onChildScrollEnd();
                  }}
                >
                  <Text style={styles.chipText}>Last Year</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, { marginRight: 8 }]}
                  onPress={() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    setDateRange({ start: '2000-01-01', end: today.toISOString().split('T')[0] });
                    onChildScrollEnd();
                  }}
                >
                  <Text style={styles.chipText}>All Time</Text>
                </TouchableOpacity>
              </View>
            </GHScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setVisible(false)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default FilterExpander;
